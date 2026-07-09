import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from '../features/auth/LoginPage'
import RegisterPage from '../features/auth/RegisterPage'

test('renders login page', () => {
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
  expect(screen.getByText('BandSheet')).toBeInTheDocument()
  expect(screen.getByLabelText('Email')).toBeInTheDocument()
  expect(screen.getByLabelText('密碼')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '登入' })).toBeInTheDocument()
})

test('renders register page', () => {
  render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>
  )
  expect(screen.getByLabelText('顯示名稱')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '註冊' })).toBeInTheDocument()
})
