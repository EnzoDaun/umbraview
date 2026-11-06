/* O relevo do polo sul na cena (card C2): a malha de reliefMesh.js virando geometria do three.
 *
 * A malha faz sombra nela mesma (castShadow e receiveShadow): é assim que uma montanha escurece a
 * cratera do lado. A cor é a mesma da esfera lisa, para a borda entre as duas não aparecer. */
import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry } from 'three'

import { buildReliefCap } from './reliefMesh.js'

export function ReliefCap({ relief, color }) {
  const geometry = useMemo(() => {
    const { positions, indices } = buildReliefCap({
      ...relief.manifest.far,
      heights: relief.heights,
      heightScale: relief.manifest.heightScale,
    })
    const built = new BufferGeometry()
    built.setAttribute('position', new BufferAttribute(positions, 3))
    built.setIndex(new BufferAttribute(indices, 1))
    // a normal de cada vértice sai dos triângulos em volta: é ela que faz a encosta virada para o
    // Sol clarear e a de costas escurecer, antes mesmo da sombra
    built.computeVertexNormals()
    return built
  }, [relief])

  // a geometria fica na placa de vídeo até alguém liberar; sem isto, cada relevo novo ficaria lá
  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={color} />
    </mesh>
  )
}
