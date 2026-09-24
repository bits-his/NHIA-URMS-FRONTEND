import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { MODULE_CONFIG, flatLeaves } from "@/src/access/moduleConfig";
import {
  buildPrivilegeSections,
  privilegeLeafTitles,
  type PrivilegeFolderNode,
  type PrivilegeLeafNode,
  type PrivilegeNode,
} from "@/src/access/privilegeTree";

type Props = {
  granted: Set<string>;
  onChange: (next: Set<string>) => void;
  className?: string;
};

function collectLeaves(node: PrivilegeNode): PrivilegeLeafNode[] {
  if (node.kind === "leaf") return [node];
  return node.children.flatMap(collectLeaves);
}

function dropOrphanParents(next: Set<string>) {
  for (const mod of MODULE_CONFIG) {
    if (!next.has(mod.title)) continue;
    const leaves = flatLeaves(mod);
    if (leaves.length > 0 && !leaves.some((t) => next.has(t))) {
      next.delete(mod.title);
    }
  }
}

function toggleLeaf(granted: Set<string>, leaf: PrivilegeLeafNode): Set<string> {
  const next = new Set(granted);
  if (next.has(leaf.title)) {
    next.delete(leaf.title);
    dropOrphanParents(next);
  } else {
    next.add(leaf.title);
    next.add(leaf.accessTo);
    leaf.alsoGrant?.forEach((p) => next.add(p));
  }
  return next;
}

function toggleFolder(granted: Set<string>, folder: PrivilegeFolderNode): Set<string> {
  const next = new Set(granted);
  const leaves = collectLeaves(folder);
  const titles = leaves.map((l) => l.title);
  const allOn = titles.length > 0 && titles.every((t) => next.has(t));

  if (titles.length === 0 && folder.accessTo) {
    if (next.has(folder.accessTo)) next.delete(folder.accessTo);
    else {
      next.add(folder.accessTo);
      folder.alsoGrant?.forEach((p) => next.add(p));
    }
    return next;
  }

  if (allOn) {
    titles.forEach((t) => next.delete(t));
    dropOrphanParents(next);
  } else {
    titles.forEach((t) => next.add(t));
    leaves.forEach((l) => {
      next.add(l.accessTo);
      l.alsoGrant?.forEach((p) => next.add(p));
    });
    if (folder.accessTo) next.add(folder.accessTo);
    folder.alsoGrant?.forEach((p) => next.add(p));
  }
  return next;
}

function folderState(folder: PrivilegeFolderNode, granted: Set<string>) {
  const titles = privilegeLeafTitles(folder);
  if (titles.length === 0) {
    const checked = !!(folder.accessTo && granted.has(folder.accessTo));
    return { checked, indeterminate: false };
  }
  const count = titles.filter((t) => granted.has(t)).length;
  return {
    checked: count === titles.length && count > 0,
    indeterminate: count > 0 && count < titles.length,
  };
}

function LeafRow({
  leaf, granted, onChange, depth,
}: {
  leaf: PrivilegeLeafNode;
  granted: Set<string>;
  onChange: (next: Set<string>) => void;
  depth: number;
}) {
  const checked = granted.has(leaf.title);
  return (
    <label
      className={`flex items-center gap-2 rounded-lg px-1.5 py-1 cursor-pointer ${
        checked ? "bg-[#e8f5ee]" : "hover:bg-slate-50"
      }`}
      style={{ paddingLeft: 6 + depth * 10 }}
    >
      <input
        type="checkbox"
        className="w-3 h-3 accent-[#145c3f] shrink-0"
        checked={checked}
        onChange={() => onChange(toggleLeaf(granted, leaf))}
      />
      <span className={`text-xs min-w-0 leading-snug ${checked ? "text-[#145c3f] font-medium" : "text-slate-600"}`}>
        {leaf.navLabel && leaf.navLabel !== leaf.title ? leaf.navLabel : leaf.title}
      </span>
    </label>
  );
}

function NestedFolder({
  folder, granted, onChange, depth,
}: {
  folder: PrivilegeFolderNode;
  granted: Set<string>;
  onChange: (next: Set<string>) => void;
  depth: number;
}) {
  const { checked, indeterminate } = folderState(folder, granted);
  const titles = privilegeLeafTitles(folder);
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <div>
      <div className="flex items-center gap-2 px-1.5 py-1" style={{ paddingLeft: 6 + depth * 10 }}>
        <input
          ref={ref}
          type="checkbox"
          className="w-3 h-3 accent-[#145c3f] shrink-0 cursor-pointer"
          checked={checked}
          onChange={() => onChange(toggleFolder(granted, folder))}
        />
        <span className={`text-[10px] font-bold uppercase tracking-wider ${checked || indeterminate ? "text-[#145c3f]" : "text-slate-400"}`}>
          {folder.label}
          {titles.length > 0 ? (
            <span className="ml-1 font-normal normal-case tracking-normal text-slate-400">
              {titles.filter((t) => granted.has(t)).length}/{titles.length}
            </span>
          ) : null}
        </span>
      </div>
      {folder.children.map((child, i) => (
        <InnerNode
          key={`${child.kind}-${i}-${child.kind === "leaf" ? child.title : child.label}`}
          node={child}
          granted={granted}
          onChange={onChange}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

function InnerNode({
  node, granted, onChange, depth,
}: {
  node: PrivilegeNode;
  granted: Set<string>;
  onChange: (next: Set<string>) => void;
  depth: number;
}) {
  if (node.kind === "leaf") {
    return <LeafRow leaf={node} granted={granted} onChange={onChange} depth={depth} />;
  }
  return <NestedFolder folder={node} granted={granted} onChange={onChange} depth={depth} />;
}

/** Top-level module card — same look as the previous 2-column access UI */
function ModuleCard({
  node, granted, onChange,
}: {
  node: PrivilegeNode;
  granted: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [open, setOpen] = React.useState(false);

  if (node.kind === "leaf") {
    const checked = granted.has(node.title);
    return (
      <div className={`rounded-xl border transition-all ${checked ? "border-[#25a872]" : "border-[#d4e8dc]"}`}>
        <label className={`flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer ${checked ? "bg-[#e8f5ee]" : "bg-white"}`}>
          <input
            type="checkbox"
            className="w-3.5 h-3.5 accent-[#145c3f] shrink-0"
            checked={checked}
            onChange={() => onChange(toggleLeaf(granted, node))}
          />
          <span className={`text-xs font-semibold ${checked ? "text-[#145c3f]" : "text-slate-700"}`}>
            {node.navLabel && node.navLabel !== node.title ? node.navLabel : node.title}
          </span>
        </label>
      </div>
    );
  }

  const { checked, indeterminate } = folderState(node, granted);
  const titles = privilegeLeafTitles(node);
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <div className={`rounded-xl border transition-all ${checked || indeterminate ? "border-[#25a872]" : "border-[#d4e8dc]"}`}>
      <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl ${checked || indeterminate ? "bg-[#e8f5ee]" : "bg-white"}`}>
        <input
          ref={ref}
          type="checkbox"
          className="w-3.5 h-3.5 accent-[#145c3f] shrink-0 cursor-pointer"
          checked={checked}
          onChange={() => onChange(toggleFolder(granted, node))}
        />
        <span className={`text-xs font-semibold flex-1 truncate ${checked || indeterminate ? "text-[#145c3f]" : "text-slate-700"}`}>
          {node.label}
        </span>
        {titles.length > 0 && (
          <button type="button" onClick={() => setOpen((o) => !o)} className="p-0.5 text-slate-400 hover:text-slate-600">
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      {open && node.children.length > 0 && (
        <div className="border-t border-[#d4e8dc] px-2 py-1.5 space-y-0.5 bg-white rounded-b-xl max-h-56 overflow-y-auto">
          {node.children.map((child, i) => (
            <InnerNode
              key={`${child.kind}-${i}-${child.kind === "leaf" ? child.title : child.label}`}
              node={child}
              granted={granted}
              onChange={onChange}
              depth={0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Module access checkboxes — 2-column cards, sidebar hierarchy when expanded. */
export default function ModuleAccessPicker({ granted, onChange, className = "" }: Props) {
  const topNodes = React.useMemo(
    () => buildPrivilegeSections().flatMap((s) => s.nodes),
    [],
  );

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${className}`}>
      {topNodes.map((node, i) => (
        <ModuleCard
          key={`${node.kind}-${i}-${node.kind === "leaf" ? node.title : node.label}`}
          node={node}
          granted={granted}
          onChange={onChange}
        />
      ))}
    </div>
  );
}
