import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { MODULE_CONFIG } from "@/src/access/moduleConfig";
import {
  assignableLeavesForModule,
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
    const leaves = assignableLeavesForModule(mod);
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

function leafKey(leaf: PrivilegeLeafNode) {
  return `${leaf.accessTo}::${leaf.title}`;
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
      className={`flex items-center gap-2 rounded-sm px-2 py-1.5 cursor-pointer ${
        checked ? "bg-[#e8f5ee]" : "hover:bg-slate-50"
      }`}
      style={{ paddingLeft: 8 + depth * 12 }}
    >
      <input
        type="checkbox"
        className="w-3.5 h-3.5 accent-[#145c3f] shrink-0 rounded-sm"
        checked={checked}
        onChange={() => onChange(toggleLeaf(granted, leaf))}
      />
      <span className={`text-xs min-w-0 leading-snug ${checked ? "text-[#145c3f] font-medium" : "text-slate-700"}`}>
        {leaf.navLabel && leaf.navLabel !== leaf.title ? leaf.navLabel : leaf.title}
      </span>
    </label>
  );
}

function NestedFolder({
  folder, granted, onChange, depth, defaultOpen = false,
}: {
  folder: PrivilegeFolderNode;
  granted: Set<string>;
  onChange: (next: Set<string>) => void;
  depth: number;
  defaultOpen?: boolean;
}) {
  const { checked, indeterminate } = folderState(folder, granted);
  const titles = privilegeLeafTitles(folder);
  const [open, setOpen] = React.useState(defaultOpen || checked || indeterminate);
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <div className="border border-[#e8f3ec] rounded-sm bg-white">
      <div
        className={`flex items-center gap-2 px-2 py-2 ${checked || indeterminate ? "bg-[#f4faf7]" : "bg-white"}`}
        style={{ paddingLeft: 8 + depth * 8 }}
      >
        <input
          ref={ref}
          type="checkbox"
          className="w-3.5 h-3.5 accent-[#145c3f] shrink-0 cursor-pointer rounded-sm"
          checked={checked}
          onChange={() => onChange(toggleFolder(granted, folder))}
        />
        <button
          type="button"
          className="flex-1 flex items-center gap-2 text-left min-w-0"
          onClick={() => setOpen((o) => !o)}
        >
          <span className={`text-[11px] font-bold tracking-wide truncate ${checked || indeterminate ? "text-[#145c3f]" : "text-slate-600"}`}>
            {folder.label}
          </span>
          {titles.length > 0 && (
            <span className="text-[10px] tabular-nums text-slate-400 shrink-0">
              {titles.filter((t) => granted.has(t)).length}/{titles.length}
            </span>
          )}
          {open ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
        </button>
      </div>
      {open && folder.children.length > 0 && (
        <div className="border-t border-[#e8f3ec] py-1">
          {folder.children.map((child, i) => (
            <InnerNode
              key={`${child.kind}-${i}-${child.kind === "leaf" ? leafKey(child) : child.label}`}
              node={child}
              granted={granted}
              onChange={onChange}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
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

function ModuleCard({
  node, granted, onChange,
}: {
  node: PrivilegeNode;
  granted: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  if (node.kind === "leaf") {
    const checked = granted.has(node.title);
    return (
      <label
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-sm border cursor-pointer ${
          checked ? "border-[#145c3f] bg-[#e8f5ee]" : "border-[#d4e8dc] bg-white"
        }`}
      >
        <input
          type="checkbox"
          className="w-3.5 h-3.5 accent-[#145c3f] shrink-0 rounded-sm"
          checked={checked}
          onChange={() => onChange(toggleLeaf(granted, node))}
        />
        <span className={`text-xs font-semibold ${checked ? "text-[#145c3f]" : "text-slate-700"}`}>
          {node.navLabel && node.navLabel !== node.title ? node.navLabel : node.title}
        </span>
      </label>
    );
  }

  return (
    <NestedFolder
      folder={node}
      granted={granted}
      onChange={onChange}
      depth={0}
      defaultOpen={node.label === "SERVICOM" || node.label === "State Office Coordination"}
    />
  );
}

/** Flat sectioned privilege list — distinct module paths stay independent. */
export default function ModuleAccessPicker({ granted, onChange, className = "" }: Props) {
  const sections = React.useMemo(() => buildPrivilegeSections(), []);

  return (
    <div className={`space-y-4 ${className}`}>
      {sections.map((section, si) => (
        <div key={section.heading || `section-${si}`} className="space-y-2">
          {section.heading ? (
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 px-0.5">
              {section.heading}
            </p>
          ) : null}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {section.nodes.map((node, i) => (
              <ModuleCard
                key={`${node.kind}-${i}-${node.kind === "leaf" ? leafKey(node) : node.label}`}
                node={node}
                granted={granted}
                onChange={onChange}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
