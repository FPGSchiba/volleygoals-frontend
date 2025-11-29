# volleygoals-frontend

This is the frontend application for VolleyGoals, built with React.

## Available Scripts

In the project directory, you can run:

### `npm run dev`

Runs the app in the development mode.

Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### `npm test`

Launches the test runner in the interactive watch mode.

See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `public/assets` folder.

It correctly bundles React in production mode and optimizes the build for the best performance.

## Deployment

The production build is served at: [https://volleygoals.schiba-apps.net](volleygoals.schiba-apps.net)

The development build is served at: [https://volleygoals-test.schiba-apps.net](volleygoals-test.schiba-apps.net)


## Prompts

### Frontend Development

1. Only use MaterialUI as components
2. Use class names and scss to style the page (Do not forget to register the new scss page in `index.scss`)
3. Please always use i18next to translate all Labels (translations are in `i18n/{lang}/translation.json`)
4. If a Form is needed use react-hook-form
5. Never implement your own API Functions. Please leave that to me as I know the API.
6. Use zustand to manage the state