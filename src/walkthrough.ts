import * as alchemy from './alchemy.json'

type Alchemy = typeof alchemy

export type ItemKey = keyof Alchemy

const getInitialItems = (a: typeof alchemy): Set<ItemKey> =>
  new Set(
    Object.entries(a)
      .filter(([, value]) => 'prime' in value && value.prime)
      .map(([key]) => key as ItemKey),
  )

const getAllCombinations = (alchemy: Alchemy): [ItemKey, ItemKey][] =>
  Object.values(alchemy)
    .filter(i => 'p' in i)
    .map(i => 'p' in i && i.p)
    .flat() as [ItemKey, ItemKey][]

const findNextStep = (
  a: typeof alchemy,
  usedCombinations: [ItemKey, ItemKey][],
  discoveredItems: Set<ItemKey>,
): [ItemKey, ItemKey] | null => {
  const allCombinations = getAllCombinations(a)
  const possibleCombinations = allCombinations.filter(
    ([a, b]) =>
      discoveredItems.has(a) &&
      discoveredItems.has(b) &&
      !usedCombinations.some(
        ([au, bu]) => (au === a && bu === b) || (au === b && bu === a),
      ),
  )
  // console.log(possibleCombinations)
  const combinationIndex = 0 // Math.floor(Math.random() * possibleCombinations.length)
  return possibleCombinations[combinationIndex]
}

const discover = (
  alchemy: Alchemy,
  step: [ItemKey, ItemKey],
  discoveredItems: Set<ItemKey>,
): ItemKey[] => {
  const discoveries = Object.entries(alchemy)
    .filter(
      ([, item]) =>
        'p' in item &&
        item.p.some(
          ([a, b]) =>
            (a === step[0] && b === step[1]) ||
            (a === step[1] && b === step[0]),
        ),
    )
    .map(([key]) => key as ItemKey)

  discoveries.forEach(discovery => discoveredItems.add(discovery))

  // find base discoveries

  type BaseProgressAlchemy = {
    base: true
    condition: { type: 'progress'; total: number }
    n: string
    p: [ItemKey, ItemKey][]
    c: ItemKey[]
  }

  type BaseElementsAlchemy = {
    base: true
    condition: { type: 'elements'; elements: ItemKey[]; min: number }
    n: string
    p: [ItemKey, ItemKey][]
    c: ItemKey[]
  }

  const baseProgressAlchemy = Object.entries(alchemy).filter(
    ([, item]) => 'base' in item && item.condition.type === 'progress',
  ) as [ItemKey, BaseProgressAlchemy][]
  const baseElementsAlchemy = Object.entries(alchemy).filter(
    ([, item]) => 'base' in item && item.condition.type === 'elements',
  ) as [ItemKey, BaseElementsAlchemy][]

  const discoveredElements = baseElementsAlchemy
    .filter(
      ([key, item]) =>
        !discoveredItems.has(key) &&
        item.condition.elements.filter(element => discoveredItems.has(element))
          .length >= item.condition.min,
    )
    .map(([key]) => key)
  discoveredElements.forEach(discovery => discoveredItems.add(discovery))

  const discoveredProgress = baseProgressAlchemy
    .filter(
      ([key, item]) =>
        !discoveredItems.has(key) &&
        item.condition.total <= discoveredItems.size,
    )
    .map(([key]) => key)
  discoveredProgress.forEach(discovery => discoveredItems.add(discovery))

  //console.log(discoveries, discoveredElements, discoveredProgress)

  return [...discoveries, ...discoveredElements, ...discoveredProgress]
}

export const walkthrough = async () => {
  const discoveredItems = getInitialItems(alchemy)
  const usedCombinations: [ItemKey, ItemKey][] = []
  let step = findNextStep(alchemy, usedCombinations, discoveredItems)
  let steps = 1

  while (step) {
    const previouslyDiscoveredItems = [...discoveredItems]
    const discoveries = discover(alchemy, step, discoveredItems)
    const isNewDiscovery = discoveries.some(
      discovery => !previouslyDiscoveredItems.includes(discovery),
    )

    if (isNewDiscovery) {
      console.log(steps++, '............................')
    }

    console.log(alchemy[step[0]].n, '+', alchemy[step[1]].n)

    if (isNewDiscovery) {
      await keypress()
    }

    console.log(
      '=>',
      ...discoveries.map(discovery => alchemy[discovery].n),
      '\n',
    )

    // next iteration preparation
    usedCombinations.push(step)
    step = findNextStep(alchemy, usedCombinations, discoveredItems)
  }

  console.log('finished')
}

const keypress = async () => {
  process.stdin.setRawMode(true)
  return new Promise(resolve =>
    process.stdin.once('data', data => {
      const byteArray = [...data]
      if (byteArray.length > 0 && byteArray[0] === 3) {
        console.log('^C')
        process.exit(1)
      }
      process.stdin.setRawMode(false)
      resolve(null)
    }),
  )
}

import history from './history.json'

export const checkHistory = () => {
  const discoveredItems = getInitialItems(alchemy)
  history
    .map(([a, b]) => [a, b] as [ItemKey, ItemKey])
    .forEach(step => {
      discover(alchemy, step, discoveredItems)
    })

  console.log(
    (Object.keys(alchemy) as ItemKey[]).find(a => !discoveredItems.has(a)),
  )
}
