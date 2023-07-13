export type Pos = [number, number]
export type Path = Uint8Array

const FULL_KANA =
  'ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズ' +
  'セゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピ' +
  'フブプヘベペホボポマミムメモャヤュユョヨラリルレロワ' +
  'ヲンーヮヰヱヵヶヴヽヾ・「」。、'

const KATA_TO_INT = new Map<string, number>()
for (let i = 0; i < FULL_KANA.length; i++) {
  KATA_TO_INT.set(FULL_KANA[i], i)
}
const INT_TO_KATA = new Map<number, string>()
for (let i = 0; i < FULL_KANA.length; i++) {
  INT_TO_KATA.set(i, FULL_KANA[i])
}

export function alignKana(text1: string, text2: string, verbose = false): Path {
  const t1 = kanasToArray(text1)
  const t2 = kanasToArray(text2)
  const paths = findPaths(t1, t2, verbose)
  return paths[0].subarray(1)
}

function kanasToArray(text: string): Uint8Array {
  const array = new Uint8Array(text.length)
  Array.from(text).forEach((c, i) => {
    const kana = KATA_TO_INT.get(c)
    console.assert(kana !== undefined, `Unknown kana: ${c}`)
    array[i] = kana!
  })
  return array
}

function findPaths(t1: Uint8Array, t2: Uint8Array, verbose = false): Path[] {
  const xSize = t1.length + 1
  const ySize = t2.length + 1
  const grid = new Int32Array(xSize * ySize)
  const directions = new Uint8Array(xSize * ySize)
  grid[0] = 0
  directions[0] = 0
  for (let x = 1; x < xSize; x++) {
    grid[x] = grid[x - 1] - 1
    directions[x] = 0b001 // left
  }
  for (let y = 1; y < ySize; y++) {
    grid[y * xSize] = grid[(y - 1) * xSize] - 1
    directions[y * xSize] = 0b010 // top
  }
  let maximum: { v: number; ps: Pos[] } = { v: 0, ps: [[0, 0]] }
  for (let y = 1; y < ySize; y++) {
    for (let x = 1; x < xSize; x++) {
      const topleft = grid[(y - 1) * xSize + x - 1]
      const top = grid[(y - 1) * xSize + x]
      const left = grid[y * xSize + x - 1]
      const vals = [left - 1, top - 1, topleft + (t1[x - 1] === t2[y - 1] ? 1 : -1)]
      const v = Math.max(...vals)
      const d = vals.reduce((acc, cur, i) => acc + Number(cur === v) * 2 ** i, 0)
      grid[y * xSize + x] = v
      directions[y * xSize + x] = d
      if (v === maximum.v) {
        maximum.ps.push([x, y])
      } else if (v > maximum.v) {
        maximum = { v, ps: [[x, y]] }
      }
    }
  }
  const paths = maximum.ps.map((p) => findPath(p, directions, xSize))
  if (verbose) {
    printGrid(grid, t1, t2)
    printPaths(paths, maximum.ps, t1, t2)
  }
  return paths
}

function findPath(p: Pos, directions: Uint8Array, xSize: number): Path {
  let [x, y] = p
  let d = directions[y * xSize + x]
  const path: number[] = [d]
  while (d) {
    if (d & 0b100) {
      // topleft
      x -= 1
      y -= 1
    } else if (d & 0b010) {
      // top
      y -= 1
    } else if (d & 0b001) {
      // left
      x -= 1
    } else {
      throw new Error('path: invalid direction: ' + d.toString(2) + ' at ' + x + ', ' + y)
    }
    d = directions[y * xSize + x]
    path.push(d)
  }
  return new Uint8Array(path.reverse())
}

function printGrid(grid: Int32Array, t1: Uint8Array, t2: Uint8Array, maxX = 50, maxY = 50): void {
  const xSize = t1.length + 1
  const xAxis: string[] = []
  t1.subarray(0, maxX).forEach((v) => xAxis.push(INT_TO_KATA.get(v)!.padStart(2, ' ')))
  const yAxis: string[] = []
  t2.subarray(0, maxY).forEach((v) => yAxis.push(INT_TO_KATA.get(v)!.padStart(2, ' ')))
  console.log('    ' + xAxis.join(' '))
  for (let y = 1; y < maxY + 1; y++) {
    const numStrs: string[] = []
    grid
      .subarray(1 + y * xSize, y * xSize + maxX + 1)
      .forEach((v) => numStrs.push(v.toString().padStart(3, ' ')))
    console.log(yAxis[y - 1] + ' ' + numStrs.join(' '))
  }
}

function printPaths(paths: Path[], ps: Pos[], t1: Uint8Array, t2: Uint8Array) {
  for (let i = 0; i < paths.length; i++) {
    const [x, y] = ps[i]
    console.log(`Path ${i + 1}/${paths.length} for position:`, x, y)
    printPath(paths[i], t1, t2)
  }
}

function printPath(path: Path, t1: Uint8Array, t2: Uint8Array) {
  let x = 0
  let y = 0
  for (const d of path.subarray(1, -1)) {
    if (d & 0b100) {
      console.log(INT_TO_KATA.get(t1[x]) + ' ' + INT_TO_KATA.get(t2[y]))
      x++
      y++
    } else if (d & 0b010) {
      console.log('　' + ' ' + INT_TO_KATA.get(t2[y]))
      y++
    } else if (d & 0b001) {
      console.log(INT_TO_KATA.get(t1[x]) + ' ' + '　')
      x++
    } else {
      throw new Error('path: invalid direction: ' + d.toString(2) + ' at ' + x + ', ' + y)
    }
  }
}
