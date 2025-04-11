import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const meta = document.createElement('meta');
meta.name = 'description';
meta.content = 'The Forge - Aura Forge management platform for crafting, fusion, farming, and dungeon exploration.';
document.head.appendChild(meta);

const title = document.createElement('title');
title.textContent = 'The Forge - Fantasy RPG Management Platform';
document.head.appendChild(title);

// Import fonts
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Nunito:wght@300;400;600;700&family=Metamorphous&display=swap';
document.head.appendChild(fontLink);

createRoot(document.getElementById("root")!).render(<App />);
