# Инструкция по деплою FROMI CRM

## Варианты деплоя

### 1. Vercel (Рекомендуется)

Vercel отлично подходит для Vite + React приложений.

#### Шаги:

1. **Установите Vercel CLI** (если еще не установлен):
```bash
npm i -g vercel
```

2. **Войдите в Vercel**:
```bash
vercel login
```

3. **Деплой**:
```bash
vercel
```

4. **Для продакшн деплоя**:
```bash
vercel --prod
```

#### Через веб-интерфейс:

1. Зайдите на [vercel.com](https://vercel.com)
2. Нажмите "Add New Project"
3. Подключите ваш GitHub репозиторий (или загрузите файлы)
4. Vercel автоматически определит Vite и настроит сборку
5. Нажмите "Deploy"

**Важно:** Vercel автоматически использует команду `npm run build` и папку `dist` для деплоя.

---

### 2. Netlify

#### Шаги:

1. **Установите Netlify CLI**:
```bash
npm i -g netlify-cli
```

2. **Войдите в Netlify**:
```bash
netlify login
```

3. **Инициализируйте проект**:
```bash
netlify init
```

4. **Деплой**:
```bash
netlify deploy --prod
```

#### Через веб-интерфейс:

1. Зайдите на [netlify.com](https://netlify.com)
2. Перетащите папку `dist` (после `npm run build`) в окно браузера
3. Или подключите GitHub репозиторий

**Настройки сборки:**
- Build command: `npm run build`
- Publish directory: `dist`

---

### 3. GitHub Pages

#### Шаги:

1. **Установите gh-pages**:
```bash
npm install --save-dev gh-pages
```

2. **Добавьте скрипты в package.json**:
```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

3. **Деплой**:
```bash
npm run deploy
```

**Важно:** Нужно настроить `base` в `vite.config.ts`:
```typescript
export default defineConfig({
  base: '/your-repo-name/',
  // ...
})
```

---

## Локальная сборка для деплоя

Перед деплоем убедитесь, что приложение собирается:

```bash
# Установите зависимости
npm install

# Соберите проект
npm run build

# Проверьте локально
npm run preview
```

После сборки папка `dist` будет содержать готовые файлы для деплоя.

---

## Важные моменты

### 1. Переменные окружения

Убедитесь, что в Supabase настроены правильные URL и ключи. Они должны быть доступны в продакшн окружении.

Файл `services/supabase.ts` использует хардкодные значения. Для продакшна рекомендуется использовать переменные окружения:

```typescript
// services/supabase.ts
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'your-url';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || 'your-key';
```

### 2. CORS настройки

Убедитесь, что в Supabase Dashboard → Settings → API разрешены домены вашего деплоя.

### 3. Realtime

Realtime должен работать автоматически, если Supabase настроен правильно.

---

## Быстрый деплой через Vercel

```bash
# 1. Соберите проект
npm run build

# 2. Деплой
npx vercel --prod
```

Или просто загрузите папку `dist` на любой хостинг!
