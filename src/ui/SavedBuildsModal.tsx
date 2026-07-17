import { useState } from 'react';
import { decodeBuild } from '../engine/buildCodec';
import { classes } from '../engine/data';
import type { SavedBuild } from '../engine/savedBuilds';

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** Class name + a short gear/perk summary, decoded from the saved code for display. */
function buildSummary(code: string): string {
  const state = decodeBuild(code);
  if (!state) return 'Unreadable build';
  const className = classes[state.classId]?.name ?? state.classId;
  const gearCount = Object.keys(state.loadout).length;
  return `${className} · ${state.perkIds.length} perks · ${state.skillIds.length} skills · ${gearCount} gear`;
}

function SavedBuildRow({
  build,
  onLoad,
  onRename,
  onDelete,
}: {
  build: SavedBuild;
  onLoad: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(build.name);

  const commitRename = () => {
    const trimmed = draft.trim();
    if (trimmed) onRename(trimmed);
    setEditing(false);
  };

  return (
    <div className="saved-build-row">
      <div className="saved-build-info">
        {editing ? (
          <input
            type="text"
            className="saved-build-name-input"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') {
                setDraft(build.name);
                setEditing(false);
              }
            }}
          />
        ) : (
          <button type="button" className="saved-build-name" onClick={() => setEditing(true)} title="Rename">
            {build.name}
          </button>
        )}
        <span className="saved-build-meta">
          {buildSummary(build.code)} · saved {formatDate(build.savedAt)}
        </span>
      </div>
      <div className="saved-build-actions">
        <button type="button" className="btn" onClick={onLoad}>
          Load
        </button>
        <button type="button" className="btn btn--ghost btn--danger" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}

interface SavedBuildsModalProps {
  builds: SavedBuild[];
  onSave: (name: string) => void;
  onLoad: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

/** Save-current-build + load/rename/delete library, mirrors ItemPickerModal's overlay pattern. */
export function SavedBuildsModal({ builds, onSave, onLoad, onRename, onDelete, onClose }: SavedBuildsModalProps) {
  const [name, setName] = useState('');

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setName('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal saved-builds-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>My Builds</h2>
          <button type="button" className="clear-btn" onClick={onClose} title="Close">
            ×
          </button>
        </div>

        <div className="save-build-row">
          <input
            type="text"
            className="item-search"
            placeholder="Name this build…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
          <button type="button" className="btn" onClick={save} disabled={!name.trim()}>
            Save Current Build
          </button>
        </div>

        <div className="saved-builds-list">
          {builds.length === 0 && <p className="hint">No saved builds yet — name and save the one you're on.</p>}
          {builds.map((b) => (
            <SavedBuildRow
              key={b.id}
              build={b}
              onLoad={() => onLoad(b.id)}
              onRename={(next) => onRename(b.id, next)}
              onDelete={() => onDelete(b.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
