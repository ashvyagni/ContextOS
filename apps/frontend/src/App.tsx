import { useState } from 'react'
import Landing from './Landing'
import Workspace from './Workspace'
import { ErrorBoundary } from './components/error-boundary'

type AppState = {
  page: 'landing' | 'workspace'
  username: string
}

function App() {
  const [state, setState] = useState<AppState>({
    page: 'landing',
    username: '',
  })

  const handleLogin = (username: string) => {
    setState({ page: 'workspace', username })
  }

  return (
    <ErrorBoundary>
      {state.page === 'landing' ? (
        <Landing onLogin={handleLogin} />
      ) : (
        <Workspace username={state.username} />
      )}
    </ErrorBoundary>
  )
}

export default App
