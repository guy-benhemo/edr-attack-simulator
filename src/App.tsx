import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./styles/globals.css";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="flex flex-col items-center justify-start pt-[10vh] text-center">
      <h1 className="font-display text-5xl font-bold mb-4">Built To Solve Real-World
      MSP Challenges</h1>
      <p className="font-sans text-lg mb-4">This is a test application for the Guardz S1 Emulation App.</p>

      <div className="flex justify-center">
        <a href="https://guardz.com" target="_blank">
          <img src="/icon.svg" className="logo guardz" alt="Guardz logo" />
        </a>
        <a href="https://guardz.com" target="_blank">
          <img src="/logo.svg" className="logo guardz" alt="Guardz logo" />
        </a>
      </div>
      <p className="my-4">Click on the Guardz logo to visit our website.</p>

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
