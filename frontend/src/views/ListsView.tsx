import { useState, useMemo } from "react";
import ListCard, { type ListItemData } from "../components/Lists/ListCard";
import Modal from "../components/Common/Modal";
import PinPrompt from "../components/Common/PinPrompt";
import { useAppContext } from "../contexts/AppContext";
import { useSkydarkDataContext } from "../contexts/SkydarkDataContext";
import { usePinGate } from "../hooks/usePinGate";
import {
  serviceCreateList,
  serviceAddListItem,
  serviceDeleteList,
  serviceDeleteListItem,
} from "../lib/skyDarkApi";
import { SKYDARK_COLORS } from "../config/theme";

export interface ListData {
  id: string;
  name: string;
  color: string;
  owner_id?: string | null;
  items: ListItemData[];
}

const FALLBACK_LISTS: ListData[] = [
  { id: "l1", name: "Grocery", color: "#E8D8F5", owner_id: null, items: [{ id: "i1", content: "Milk", completed: false }] },
];

function buildListsFromSkydark(
  lists: { id: string; name: string; color?: string | null; owner_id?: string | null }[],
  listItems: Record<string, { id: string; content: string; completed: number }[]>
): ListData[] {
  return lists.map((list) => ({
    id: list.id,
    name: list.name,
    color: list.color ?? "#C8E6F5",
    owner_id: list.owner_id ?? null,
    items: (listItems[list.id] ?? []).map((i) => ({
      id: i.id,
      content: i.content,
      completed: Boolean(i.completed),
    })),
  }));
}

export default function ListsView() {
  const skydark = useSkydarkDataContext();
  const { familyMembers } = useAppContext();
  const { runIfUnlocked, pinPromptProps } = usePinGate();
  const [filterOwnerId, setFilterOwnerId] = useState<string>("");
  const [addListOpen, setAddListOpen] = useState(false);
  const [listToDelete, setListToDelete] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [newListColor, setNewListColor] = useState<string>(SKYDARK_COLORS[0] ?? "#C8E6F5");
  const [newListOwnerId, setNewListOwnerId] = useState<string>("");
  const [localToggles, setLocalToggles] = useState<Set<string>>(new Set());
  const [localLists, setLocalLists] = useState<ListData[]>(FALLBACK_LISTS);
  const [createListSaving, setCreateListSaving] = useState(false);
  const [createListError, setCreateListError] = useState<string | null>(null);
  const [listsError, setListsError] = useState<string | null>(null);
  const [listDeleteSaving, setListDeleteSaving] = useState(false);

  const serverLists = useMemo(() => {
    if (!skydark?.data?.connection || !skydark.data.lists) return [];
    return buildListsFromSkydark(skydark.data.lists, skydark.data.listItems ?? {});
  }, [skydark?.data?.connection, skydark?.data?.lists, skydark?.data?.listItems]);

  const lists = skydark?.data?.connection
    ? serverLists.map((list) => ({
        ...list,
        items: list.items.map((i) => ({
          ...i,
          completed: localToggles.has(i.id) ? !i.completed : i.completed,
        })),
      }))
    : localLists;

  const addItem = (listId: string, content: string) => {
    runIfUnlocked("addItemsToLists", () => doAddItem(listId, content));
  };

  const doAddItem = async (listId: string, content: string) => {
    const conn = skydark?.data?.connection;
    if (conn) {
      try {
        await serviceAddListItem(conn, { list_id: listId, content });
        await skydark?.refetchLists();
      } catch {
        // leave as-is
      }
      return;
    }
    setLocalLists((prev) =>
      prev.map((list) => {
        if (list.id !== listId) return list;
        return { ...list, items: [...list.items, { id: `i${Date.now()}`, content, completed: false }] };
      })
    );
  };

  const toggleItem = (listId: string, itemId: string) => {
    runIfUnlocked("checkLists", () => {
      if (skydark?.data?.connection) {
        setLocalToggles((prev) => {
          const next = new Set(prev);
          if (next.has(itemId)) next.delete(itemId);
          else next.add(itemId);
          return next;
        });
      } else {
        setLocalLists((prev) =>
          prev.map((list) => {
            if (list.id !== listId) return list;
            return { ...list, items: list.items.map((i) => (i.id === itemId ? { ...i, completed: !i.completed } : i)) };
          })
        );
      }
    });
  };

  const deleteItem = (listId: string, itemId: string) => {
    runIfUnlocked("addItemsToLists", () => doDeleteItem(listId, itemId));
  };

  const doDeleteItem = async (listId: string, itemId: string) => {
    const conn = skydark?.data?.connection;
    if (conn) {
      setListsError(null);
      try {
        await serviceDeleteListItem(conn, itemId);
        setLocalToggles((prev) => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
        await skydark?.refetchLists?.();
      } catch (e) {
        setListsError(e instanceof Error ? e.message : "Could not delete item.");
      }
      return;
    }
    setLocalLists((prev) =>
      prev.map((list) =>
        list.id !== listId ? list : { ...list, items: list.items.filter((i) => i.id !== itemId) }
      )
    );
  };

  const requestDeleteList = (listId: string) => {
    setListToDelete(listId);
  };

  const confirmDeleteList = () => {
    if (!listToDelete) return;
    const id = listToDelete;
    runIfUnlocked("deleteLists", async () => {
      const conn = skydark?.data?.connection;
      if (!conn) {
        setLocalLists((prev) => prev.filter((l) => l.id !== id));
        setListToDelete(null);
        return;
      }
      setListsError(null);
      setListDeleteSaving(true);
      try {
        await serviceDeleteList(conn, id);
        await skydark?.refetchLists?.();
        setListToDelete(null);
      } catch (e) {
        setListsError(e instanceof Error ? e.message : "Could not delete list.");
      } finally {
        setListDeleteSaving(false);
      }
    });
  };

  const createList = () => {
    const name = newListName.trim();
    if (!name) return;
    runIfUnlocked("createLists", () => doCreateList(name));
  };

  const doCreateList = async (name: string) => {
    setCreateListError(null);
    setCreateListSaving(true);
    const conn = skydark?.data?.connection;
    try {
      if (conn) {
        await serviceCreateList(conn, {
          name,
          color: newListColor,
          owner_id: newListOwnerId || undefined,
        });
        setNewListName("");
        setNewListColor(SKYDARK_COLORS[0] ?? "#C8E6F5");
        setNewListOwnerId("");
        setAddListOpen(false);
        await skydark?.refetchLists?.();
      } else {
        setLocalLists((prev) => [
          ...prev,
          { id: `l${Date.now()}`, name, color: newListColor, owner_id: newListOwnerId || null, items: [] },
        ]);
        setNewListName("");
        setNewListColor(SKYDARK_COLORS[0] ?? "#C8E6F5");
        setNewListOwnerId("");
        setAddListOpen(false);
      }
    } catch (e) {
      setCreateListError(e instanceof Error ? e.message : "Could not create list. Check Home Assistant logs.");
    } finally {
      setCreateListSaving(false);
    }
  };

  const filteredLists = filterOwnerId
    ? lists.filter((l) => (l.owner_id ?? "") === filterOwnerId)
    : lists;

  return (
    <div className="min-h-full">
      {listsError && (
        <div
          className="mb-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800 flex justify-between gap-2 items-start"
          role="alert"
        >
          <span>{listsError}</span>
          <button type="button" className="shrink-0 text-red-700 underline" onClick={() => setListsError(null)}>
            Dismiss
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="text-lg font-semibold text-skydark-text">Lists</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-2">
            <span className="text-sm text-skydark-text-secondary">Assignee:</span>
            <select
              value={filterOwnerId}
              onChange={(e) => setFilterOwnerId(e.target.value)}
              className="input-skydark py-2 min-w-[120px]"
            >
              <option value="">All</option>
              {familyMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setAddListOpen(true)}
            className="btn-primary"
          >
            + New list
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-6 pb-4">
        {filteredLists.map((list) => (
          <ListCard
            key={list.id}
            id={list.id}
            name={list.name}
            color={list.color}
            ownerName={familyMembers.find((m) => m.id === list.owner_id)?.name}
            items={list.items}
            onAddItem={(content) => addItem(list.id, content)}
            onToggleItem={(itemId) => toggleItem(list.id, itemId)}
            onDeleteItem={(itemId) => deleteItem(list.id, itemId)}
            onDeleteList={() => requestDeleteList(list.id)}
          />
        ))}
      </div>

      <Modal
        open={addListOpen}
        onClose={() => {
          setAddListOpen(false);
          setCreateListError(null);
        }}
        title="Create list"
      >
        <div className="space-y-4">
          {createListError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2" role="alert">
              {createListError}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-skydark-text mb-1">List name</label>
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              className="input-skydark"
              placeholder="e.g. Grocery"
              disabled={createListSaving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-skydark-text mb-1">Color</label>
            <div className="flex gap-2 flex-wrap">
              {SKYDARK_COLORS.map((c: string) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewListColor(c)}
                  disabled={createListSaving}
                  className="w-8 h-8 rounded-full border-2 disabled:opacity-50"
                  style={{
                    backgroundColor: c,
                    borderColor: newListColor === c ? "#2B3A4A" : "transparent",
                  }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-skydark-text mb-1">Assign to</label>
            <select
              value={newListOwnerId}
              onChange={(e) => setNewListOwnerId(e.target.value)}
              className="input-skydark"
              disabled={createListSaving}
            >
              <option value="">Everyone</option>
              {familyMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setAddListOpen(false);
                setCreateListError(null);
              }}
              disabled={createListSaving}
              className="btn-secondary flex-1 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={createList}
              disabled={!newListName.trim() || createListSaving}
              className="btn-primary flex-1 disabled:opacity-60"
            >
              {createListSaving ? "Creating…" : "Create"}
            </button>
          </div>
        </div>
      </Modal>
      <Modal
        open={listToDelete !== null}
        onClose={() => !listDeleteSaving && setListToDelete(null)}
        title="Delete list"
      >
        <p className="text-skydark-text mb-4">Delete this list and all its items?</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setListToDelete(null)}
            disabled={listDeleteSaving}
            className="btn-secondary flex-1 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmDeleteList}
            disabled={listDeleteSaving}
            className="btn-primary flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-60"
          >
            {listDeleteSaving ? "Deleting…" : "Delete"}
          </button>
        </div>
      </Modal>
      <PinPrompt {...pinPromptProps} />
    </div>
  );
}
