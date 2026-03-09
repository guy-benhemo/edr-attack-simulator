import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="flex flex-col items-center justify-start pt-[10vh] text-center">
      <h1 className="text-3xl font-bold mb-4">Welcome to Tauri + React</h1>

      <div className="flex justify-center">
        <a href="https://vite.dev" target="_blank">
          <img src="/vite.svg" className="logo vite" alt="Vite logo" />
        </a>
        <a href="https://tauri.app" target="_blank">
          <img src="/tauri.svg" className="logo tauri" alt="Tauri logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <p className="my-4">Click on the Tauri, Vite, and React logos to learn more.</p>

      <form
        className="flex justify-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          id="greet-input"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
          className="rounded-lg border border-transparent px-5 py-2 text-base font-medium bg-white text-gray-900 shadow-sm outline-none transition-colors focus:border-blue-500 dark:bg-black/60 dark:text-white"
        />
        <button
          type="submit"
          className="rounded-lg border border-transparent px-5 py-2 text-base font-medium bg-white text-gray-900 shadow-sm cursor-pointer outline-none transition-colors hover:border-blue-500 active:border-blue-500 active:bg-gray-200 dark:bg-black/60 dark:text-white dark:active:bg-black/40"
        >
          Greet
        </button>
      </form>
      <p className="mt-4">{greetMsg}</p>
    </main>
  );
}

export default App;
