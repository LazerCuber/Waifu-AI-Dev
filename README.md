## Credits to the [original repo](https://github.com/unteifu/wAIfu) 

# So what is this for?:
- Some more performance optimizations
- Latency improvements
- Live2d lag fix
- Speech to Text coming soon
- Live2d Lip sync
- Smoother Live2D movements
- Live2D Expression System

![Alt text](/demo.png)

### Requirements
* node
* pnpm >= 9.2.0
  ```sh
  npm install -g pnpm
  ```
* ChatGPT or Groq API key (optional) (Unavailable Soon For Groq)
* SambaNova API key (optional, must choose either one of them) 
* ElevenLabs API key

### Installation

1. Clone the repo
    ```sh
    git clone https://github.com/LazerCuber/Waifu-AI.git
    ```
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
    SAMBANOVA_API_KEY="your_sambanova_api_key"
    GROQ_API_KEY="your_groq_api_key"
    ELEVENLABS_API_KEY="your_eleven-labs_api_key"
    VOICE_ID="your_voice_id"
    ```

4. Live2D Expression Setup
    - Place your Live2D model files in `public/model/`
    - Required expression files (in .exp3.json format):
      - Happy.exp3.json
      - Sad.exp3.json
      - Scared.exp3.json
      - Angry.exp3.json
      - Joy.exp3.json
      - Neutral.exp3.json
    - Make sure these are referenced in your `your_model.model3.json`

5. Run the development server
    ```sh
    pnpm run dev
    ```

6. Open [http://localhost:3000](http://localhost:3000) and you're done!

### Customizing Expressions

To modify the available expressions or their triggers, you'll need to edit two files:

1. `src/app/api/chat/route.ts` - Contains the system prompt that defines emotion tags
2. `src/app/api/synthasize/route.ts` - Handles voice synthesis and emotion processing

The default emotions are:
- [Happy] - For joy, excitement, pleasure
- [Sad] - For concern, empathy, sadness
- [Scared] - For surprise, worry
- [Angry] - For serious concern or defense
- [Joy] - For celebration and delight
- [Neutral] - For casual conversation

Have a nice chat!

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
