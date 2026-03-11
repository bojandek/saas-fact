import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import '@testing-library/jest-dom'
import { CheckoutButton } from './CheckoutButton'
import * as stripeModule from '@stripe/stripe-js'

// Mock Stripe
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve({
    redirectToCheckout: vi.fn(() => Promise.resolve({ error: null }))
  }))
}))

describe('CheckoutButton', () => {
  it('renders button', () => {
    render(<CheckoutButton priceId="price_123" />)
    const button = screen.getByRole('button', { name: /subscribe/i })
    expect(button).toBeTruthy()
  })

  it('button has correct text', () => {
    render(<CheckoutButton priceId="price_123" />)
    expect(screen.getByText('Subscribe')).toBeTruthy()
  })

  it('button is clickable', () => {
    render(<CheckoutButton priceId="price_123" />)
    const button = screen.getByRole('button')
    expect(button).not.toHaveAttribute('disabled')
  })
})
