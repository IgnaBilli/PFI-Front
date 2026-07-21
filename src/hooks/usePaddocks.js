import { useEffect, useState } from 'react'

const STORAGE_KEY = 'terrabovina-paddocks'
const CATTLE_KEY = 'terrabovina-cattle'

function readPaddocks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []
  } catch {
    return []
  }
}

function readCattle() {
  try {
    return JSON.parse(localStorage.getItem(CATTLE_KEY)) ?? []
  } catch {
    return []
  }
}

function writeCattle(cattle) {
  localStorage.setItem(CATTLE_KEY, JSON.stringify(cattle))
}

function generateUniqueCaravana(existingCattle) {
  const existingIds = new Set(existingCattle.map((c) => c.id))
  let attempts = 0
  while (attempts < 1000) {
    const num = Math.floor(1000 + Math.random() * 9000)
    const id = `AR-${num}`
    if (!existingIds.has(id)) {
      return id
    }
    attempts++
  }
  return `AR-${Math.floor(1000 + Math.random() * 9000)}`
}

export default function usePaddocks() {
  const [paddocks, setPaddocks] = useState(readPaddocks)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(paddocks))
  }, [paddocks])

  function addPaddock(paddock) {
    setPaddocks((current) => [...current, paddock])

    const count = Number(paddock.animals) || 0
    if (count > 0) {
      const currentCattle = readCattle()
      const newCattle = [...currentCattle]
      for (let i = 0; i < count; i++) {
        newCattle.push({
          id: generateUniqueCaravana(newCattle),
          category: '-',
          weight: '-',
          cc: '-',
          status: 'DESCONOCIDO',
          paddock: paddock.name
        })
      }
      writeCattle(newCattle)
    }
  }

  function removePaddock(id) {
    const paddockToRemove = paddocks.find((p) => p.id === id)
    setPaddocks((current) => current.filter((paddock) => paddock.id !== id))

    if (paddockToRemove) {
      const currentCattle = readCattle()
      const updatedCattle = currentCattle.filter((c) => c.paddock !== paddockToRemove.name)
      writeCattle(updatedCattle)
    }
  }

  function updatePaddock(updatedPaddock) {
    const oldPaddock = paddocks.find((p) => p.id === updatedPaddock.id)
    setPaddocks((current) => current.map((paddock) => paddock.id === updatedPaddock.id ? updatedPaddock : paddock))

    if (oldPaddock) {
      const currentCattle = readCattle()
      let updatedCattle = [...currentCattle]

      // 1. If renamed, update cattle paddock names
      if (oldPaddock.name !== updatedPaddock.name) {
        updatedCattle = updatedCattle.map((c) => c.paddock === oldPaddock.name ? { ...c, paddock: updatedPaddock.name } : c)
      }

      // 2. Adjust cattle count
      const oldCount = Number(oldPaddock.animals) || 0
      const newCount = Number(updatedPaddock.animals) || 0

      if (newCount > oldCount) {
        const diff = newCount - oldCount
        for (let i = 0; i < diff; i++) {
          updatedCattle.push({
            id: generateUniqueCaravana(updatedCattle),
            category: '-',
            weight: '-',
            cc: '-',
            status: 'DESCONOCIDO',
            paddock: updatedPaddock.name
          })
        }
      } else if (newCount < oldCount) {
        const diff = oldCount - newCount
        let removed = 0
        for (let i = updatedCattle.length - 1; i >= 0; i--) {
          if (updatedCattle[i].paddock === updatedPaddock.name) {
            updatedCattle.splice(i, 1)
            removed++
            if (removed === diff) break
          }
        }
      }

      writeCattle(updatedCattle)
    }
  }

  return { paddocks, addPaddock, removePaddock, updatePaddock }
}
