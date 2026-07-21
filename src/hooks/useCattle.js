import { useEffect, useState } from 'react'

const CATTLE_KEY = 'terrabovina-cattle'
const PADDOCKS_KEY = 'terrabovina-paddocks'

function readCattle() {
  try {
    return JSON.parse(localStorage.getItem(CATTLE_KEY)) ?? []
  } catch {
    return []
  }
}

function readPaddocks() {
  try {
    return JSON.parse(localStorage.getItem(PADDOCKS_KEY)) ?? []
  } catch {
    return []
  }
}

export function generateUniqueCaravana(existingCattle) {
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

export default function useCattle() {
  const [cattle, setCattle] = useState(readCattle)

  useEffect(() => {
    localStorage.setItem(CATTLE_KEY, JSON.stringify(cattle))
  }, [cattle])

  // Sync paddocks count when cattle list changes directly
  function syncPaddocksCount(updatedCattleList) {
    try {
      const paddocks = readPaddocks()
      const updatedPaddocks = paddocks.map((paddock) => {
        const count = updatedCattleList.filter((c) => c.paddock === paddock.name).length
        return { ...paddock, animals: count }
      })
      localStorage.setItem(PADDOCKS_KEY, JSON.stringify(updatedPaddocks))
      // Trigger local storage event so other open pages update their state
      window.dispatchEvent(new Event('storage'))
    } catch (e) {
      console.error('Error syncing paddocks count:', e)
    }
  }

  function addAnimal(animal) {
    setCattle((current) => {
      const newList = [...current, animal]
      syncPaddocksCount(newList)
      return newList
    })
  }

  function removeAnimal(id) {
    setCattle((current) => {
      const newList = current.filter((animal) => animal.id !== id)
      syncPaddocksCount(newList)
      return newList
    })
  }

  function updateAnimal(updatedAnimal) {
    setCattle((current) => {
      const newList = current.map((animal) => animal.id === updatedAnimal.id ? updatedAnimal : animal)
      syncPaddocksCount(newList)
      return newList
    })
  }

  function updateCattle(newList) {
    setCattle(newList)
    syncPaddocksCount(newList)
  }

  return { cattle, setCattle, addAnimal, removeAnimal, updateAnimal, updateCattle }
}
