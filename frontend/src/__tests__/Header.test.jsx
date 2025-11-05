import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AppProvider } from '../../src/context/AppContext.jsx'
import Header from '../../src/components/Header.jsx'

test('renders header and navigation', () => {
  render(
    <AppProvider>
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    </AppProvider>
  )
  expect(screen.getByText(/Course Builder/i)).toBeInTheDocument()
  expect(screen.getByText(/Courses/i)).toBeInTheDocument()
})


