import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter, MemoryRouterProps } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#C41E3A' },
    secondary: { main: '#000000' },
    success: { main: '#4caf50' },
    error: { main: '#C41E3A' },
    warning: { main: '#ff9800' },
    info: { main: '#2196f3' },
  },
});

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: MemoryRouterProps['initialEntries'];
}

function AllProviders({ children, initialEntries }: { children: React.ReactNode; initialEntries?: MemoryRouterProps['initialEntries'] }) {
  return (
    <MemoryRouter initialEntries={initialEntries || ['/']}>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </MemoryRouter>
  );
}

function customRender(ui: ReactElement, options?: CustomRenderOptions) {
  const { initialEntries, ...renderOptions } = options || {};
  return render(ui, {
    wrapper: ({ children }) => <AllProviders initialEntries={initialEntries}>{children}</AllProviders>,
    ...renderOptions,
  });
}

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
