import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.tmp_parse.js']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Các effect hiện tại dùng để tải dữ liệu và polling; việc set state sau
      // phản hồi API là chủ đích, không phải render loop.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
    },
  },
  {
    // Màn phân công HDV còn giữ một số state dự phòng cho các chế độ UI cũ.
    // Không coi chúng là lỗi chạy ứng dụng trong khi chưa loại bỏ hẳn các chế độ đó.
    files: ['src/pages/admin/tourDepartures/GuideAssignmentPage.jsx'],
    rules: {
      'no-unused-vars': 'off',
    },
  },
])
