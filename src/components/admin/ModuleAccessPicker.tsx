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

function leafKey(leaf: PrivilegeLeafNode) {
  return `${leaf.accessTo}::${leaf.title}`;
}

function isLeafGranted(leaf: PrivilegeLeafNode, granted: Set<string>): boolean {
  const scoped = leafKey(leaf);
  if (granted.has(scoped)) return true;
  if (granted.has(leaf.title)) {
    const hasOtherScoped = Array.from(granted).some(
      (k) => k.endsWith(`::${leaf.title}`) && !k.startsWith(`${leaf.accessTo}::`),
    );
    if (!hasOtherScoped) return true;
  }
  return false;
}

function dropOrphanParents(next: Set<string>) {
  for (const mod of MODULE_CONFIG) {
    if (!next.has(mod.title)) continue;
    const leaves = assignableLeavesForModule(mod);
    const hasAnyLeaf = leaves.some(
      (t) => next.has(`${mod.title}::${t}`) || next.has(t),
    );
    if (leaves.length > 0 && !hasAnyLeaf) {
      next.delete(mod.title);
    }
  }
}

function toggleLeaf(granted: Set<string>, leaf: PrivilegeLeafNode): Set<string> {
  const next = new Set(granted);
  const scoped = leafKey(leaf);
  const isChecked = isLeafGranted(leaf, next);

  if (isChecked) {
    next.delete(scoped);
    const otherHasIt = Array.from(next).some((k) => k.endsWith(`::${leaf.title}`));
    if (!otherHasIt) {
      next.delete(leaf.title);
    }
    dropOrphanParents(next);
  } else {
    next.add(scoped);
    next.add(leaf.title);
    next.add(leaf.accessTo);
    leaf.alsoGrant?.forEach((p) => next.add(p));
  }
  return next;
}

function toggleFolder(granted: Set<string>, folder: PrivilegeFolderNode): Set<string> {
  const next = new Set(granted);
  const leaves = collectLeaves(folder);
  const allOn = leaves.length > 0 && leaves.every((l) => isLeafGranted(l, next));

  if (leaves.length === 0 && folder.accessTo) {
    if (next.has(folder.accessTo)) next.delete(folder.accessTo);
    else {
      next.add(folder.accessTo);
      folder.alsoGrant?.forEach((p) => next.add(p));
    }
    return next;
  }

  if (allOn) {
    leaves.forEach((l) => {
      next.delete(leafKey(l));
      const otherHasIt = Array.from(next).some((k) => k.endsWith(`::${l.title}`));
      if (!otherHasIt) next.delete(l.title);
    });
    dropOrphanParents(next);
  } else {
    leaves.forEach((l) => {
      next.add(leafKey(l));
      next.add(l.title);
      next.add(l.accessTo);
      l.alsoGrant?.forEach((p) => next.add(p));
    });
    if (folder.accessTo) next.add(folder.accessTo);
    folder.alsoGrant?.forEach((p) => next.add(p));
  }
  return next;
}

function folderState(folder: PrivilegeFolderNode, granted: Set<string>) {
  const leaves = collectLeaves(folder);
  if (leaves.length === 0) {
    const checked = !!(folder.accessTo && granted.has(folder.accessTo));
    return { checked, indeterminate: false };
  }
  const count = leaves.filter((l) => isLeafGranted(l, granted)).length;
  return {
    checked: count === leaves.length && count > 0,
    indeterminate: count > 0 && count < leaves.length,
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
  const checked = isLeafGranted(leaf, granted);
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
  const leaves = collectLeaves(folder);
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
          {leaves.length > 0 && (
            <span className="text-[10px] tabular-nums text-slate-400 shrink-0">
              {leaves.filter((l) => isLeafGranted(l, granted)).length}/{leaves.length}
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

function sameNameSingleChild(folder: PrivilegeFolderNode): PrivilegeLeafNode | null {
  if (folder.children.length !== 1) return null;
  const only = folder.children[0];
  if (only.kind !== "leaf") return null;
  const label = only.navLabel && only.navLabel !== only.title ? only.navLabel : only.title;
  if (only.title === folder.label || label === folder.label) return only;
  return null;
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
  const collapsed = sameNameSingleChild(node);
  if (collapsed) {
    return <LeafRow leaf={collapsed} granted={granted} onChange={onChange} depth={depth} />;
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
    const checked = isLeafGranted(node, granted);
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

  const collapsed = sameNameSingleChild(node);
  if (collapsed) {
    return <ModuleCard node={collapsed} granted={granted} onChange={onChange} />;
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
