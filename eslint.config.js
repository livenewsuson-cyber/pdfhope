import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores:['dist','coverage'] },
  { extends:[js.configs.recommended,...tseslint.configs.recommended],files:['**/*.{ts,tsx}'],languageOptions:{ecmaVersion:2022,globals:{AbortController:'readonly',AbortSignal:'readonly',Blob:'readonly',crypto:'readonly',DOMException:'readonly',File:'readonly',fetch:'readonly',ReadableStream:'readonly',Request:'readonly',Response:'readonly',TextDecoder:'readonly',TextEncoder:'readonly',URL:'readonly',window:'readonly',document:'readonly',localStorage:'readonly',matchMedia:'readonly',addEventListener:'readonly',removeEventListener:'readonly',createImageBitmap:'readonly',HTMLCanvasElement:'readonly'}},plugins:{'react-hooks':reactHooks,'react-refresh':reactRefresh},rules:{...reactHooks.configs.recommended.rules,'react-refresh/only-export-components':['warn',{allowConstantExport:true}],'@typescript-eslint/no-explicit-any':'off'}}
)
