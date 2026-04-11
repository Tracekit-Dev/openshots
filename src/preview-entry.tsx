import { createRoot } from "react-dom/client";
import PreviewWindow from "./components/preview/PreviewWindow";
import "./index.css";

createRoot(document.getElementById("preview-root")!).render(<PreviewWindow />);
