import { render, screen } from '@testing-library/react'
import App from '../App'

test('renders BandSheet homepage', () => {
  render(<App />)
  expect(screen.getByText('BandSheet')).toBeInTheDocument()
})
