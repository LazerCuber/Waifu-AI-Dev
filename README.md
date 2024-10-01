## Credits to the [original repo](https://github.com/unteifu/wAIfu) 

# So what is this for?:
- Some more performance optimizations
- Latency improvments
- Live2d lag fix
- Speech to Text coming soon
- Live2d Lip sync
- Smoother Live2D movements

![Alt text](/demo.png)

### Requirements (same with the original repo) 
* node
* pnpm >= 9.2.0
  ```sh
  npm install -g pnpm
  ```
* ChatGPT or Groq API key (optional) (Unavailable Soon For Groq)
* Mistral API key (optional, must choose either one of them) 
* ElevenLabs API key

    or if you have the GitHub CLI installed

    ```sh
   gh repo clone LazerCuber/Waifu-AI
    ```
2. Install NPM packages
    ```sh
    pnpm install
    ```
3. Copy the `.env.example` and rename to `.env` in the root directory and update the following values
    ```env
    OPENAI_API_KEY="your_chatgpt_api_key"
    MISTRAL_API_KEY="your_mistral_api_key"
    GROQ_API_KEY="your_groq_api_key"
    ELEVENLABS_API_KEY="your_elevenlabs_api_key"
    VOICE_ID="your_voice_id"
    ```
4. Run the development server
    ```sh
    pnpm run dev
    ```
5. Open [http://localhost:3000](http://localhost:3000) and wallah you done :)

Have a nice chat


```
Waifu-AI
├─ .eslintrc.cjs
│  ├─ index
│  ├─ info
│  │  └─ exclude
│  ├─ logs
│  │  ├─ HEAD
│  │  └─ refs
│  │     ├─ heads
│  │     │  ├─ main
│  │     │  └─ stuff
│  │     └─ remotes
│  │        └─ origin
│  │           ├─ main
│  │           └─ stuff
│  ├─ objects
│  │  ├─ info
│  │  └─ pack
│  ├─ ORIG_HEAD
│  └─ refs
│     ├─ heads
│     │  ├─ main
│     │  └─ stuff
│     ├─ remotes
│     │  └─ origin
│     │     ├─ main
│     │     └─ stuff
│     └─ tags
├─ .gitignore
├─ next.config.js
├─ package.json
├─ pnpm-lock.yaml
├─ postcss.config.cjs
├─ prettier.config.js
├─ public
│  ├─ layerfull.svg
│  ├─ live2dcubismcore.min.js
│  ├─ model
├─ README.md
├─ src
│  ├─ app
│  │  ├─ api
│  │  │  ├─ chat
│  │  │  │  └─ route.ts
│  │  │  └─ synthasize
│  │  │     └─ route.ts
│  │  ├─ layout.tsx
│  │  └─ page.tsx
│  ├─ atoms
│  │  └─ ChatAtom.ts
│  ├─ components
│  │  ├─ ChatInput.tsx
│  │  ├─ ChatterBox.tsx
│  │  ├─ Model.tsx
│  │  └─ Spinner.tsx
│  ├─ env.js
│  └─ styles
│     └─ globals.css
├─ static
│  └─ favicon.ico
├─ tailwind.config.ts
└─ tsconfig.json

```
