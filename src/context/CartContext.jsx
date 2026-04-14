import React, { createContext, useContext, useState } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState([]) // [{id, name, price, qty, type: 'service'|'product'}]

  const addItem = (item) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id && i.type === item.type)
      if (existing) {
        return prev.map(i =>
          i.id === item.id && i.type === item.type
            ? { ...i, qty: i.qty + 1 }
            : i
        )
      }
      return [...prev, { ...item, qty: 1 }]
    })
  }

  const removeItem = (id, type) => {
    setItems(prev => prev.filter(i => !(i.id === id && i.type === type)))
  }

  const updateQty = (id, type, delta) => {
    setItems(prev => {
      return prev
        .map(i => i.id === id && i.type === type ? { ...i, qty: i.qty + delta } : i)
        .filter(i => i.qty > 0)
    })
  }

  const clearCart = () => setItems([])

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const count = items.reduce((sum, i) => sum + i.qty, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
