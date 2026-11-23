// Phase 1 placeholder: proves the content pipeline reaches the browser. The real UI arrives in Phase 2.
import { createRoot } from "react-dom/client";
import library from "virtual:library";

const n = library.topics.length;
const m = library.notes.length;

createRoot(document.getElementById("root")!).render(
  <p>{n ? `${n} topic${n > 1 ? "s" : ""} from ${m} note${m !== 1 ? "s" : ""}` : "No topics yet"}</p>,
);
