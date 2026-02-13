import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomePage } from '@/pages/HomePage';
import { Toaster } from '@/components/ui/toaster';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HomePage />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
