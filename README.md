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

## Environment Variables

All environment variables are injected at build time via esbuild. Configure them in a `.env` file for local development, or set them in your hosting environment (e.g. AWS Amplify console) for deployed builds.

| Variable                      | Description                  | Required | Default          | Example                          |
|-------------------------------|------------------------------|----------|------------------|----------------------------------|
| `API_HOST`                    | Backend API host             | No       | `localhost:8000` | `api.volleygoals.com`            |
| `API_PROTOCOL`                | Backend API protocol         | No       | `https`          | `http`                           |
| `API_PATH_ROOT`               | Backend API base path        | No       | `/api/v1`        | `/api/v1`                        |
| `COGNITO_USER_POOL_ID`        | AWS Cognito User Pool ID     | Yes      | —                | `eu-central-1_xxxxxxxx`          |
| `COGNITO_USER_POOL_CLIENT_ID` | AWS Cognito App Client ID    | Yes      | —                | `abcdef1234567890`               |
| `COGNITO_IDENTITY_POOL_ID`    | AWS Cognito Identity Pool ID | Yes      | —                | `eu-central-1:xxxxxxxx-xxxx-...` |
| `COGNITO_REGION`              | AWS region for Cognito       | No       | `eu-central-1`   | `eu-central-1`                   |

For local development, create a `.env` file in the project root (see `.env` for reference). For Amplify deployments, set these in each app's **Environment variables** settings (App settings > Environment variables) with the corresponding Cognito pool values for each environment.

## Deployment

The production build is served at: [https://volleygoals.schiba-apps.net](volleygoals.schiba-apps.net)

The development build is served at: [https://volleygoals-test.schiba-apps.net](volleygoals-test.schiba-apps.net)


## Prompts

### Frontend Development

1. Only use MaterialUI as components
2. Please keep in mind that each page should be its own component in the `pages` folder
   1. Also each page should have its own scss file in the `styles/pages` folder
   2. Additionally each page should have one paper as its root component
3. Use class names and scss to style the page (Do not forget to register the new scss page in `index.scss`)
4. Please always use i18next to translate all Labels (translations are in `i18n/{lang}/translation.json`)
5. If a Form is needed use react-hook-form
6. Never implement your own API Functions. Please leave that to me as I know the API.
7. Use zustand to manage the state