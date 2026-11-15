/* O mapa das áreas com janela de pouso, pintado sobre o relevo do polo.
 *
 * Não é uma malha a mais por cima do relevo: a máscara vai para o shader das malhas do relevo
 * (moonGlobe.js), e a mancha sai colada no chão, de perto e de longe, sem disputar profundidade
 * com as montanhas. Este componente só transforma o resultado da conta numa textura e liga ou
 * desliga o mapa.
 */
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { Color, DataTexture, LinearFilter, RedFormat, UnsignedByteType } from 'three'

import { landingMask } from '../engine/landingGridFiles.js'
import { setLandingMask } from './moonGlobe.js'

/* areas: o { flags, layout } do useLandingAreas, ou null com o mapa desligado ou ainda sem
   resultado. color: a cor das manchas, do token, lida pela cena. */
export function LandingAreasLayer({ areas, color }) {
  const invalidate = useThree((state) => state.invalidate)

  const texture = useMemo(() => {
    if (!areas) return null
    const { layout, flags } = areas
    const built = new DataTexture(landingMask(layout, flags), layout.columns, layout.rows, RedFormat, UnsignedByteType)
    // o filtro suave arredonda os cantos dos quadrados de 5 km: a mancha fica com cara de área, e
    // não de pixels
    built.magFilter = LinearFilter
    built.minFilter = LinearFilter
    built.needsUpdate = true
    return built
  }, [areas])
  useEffect(() => () => texture?.dispose(), [texture])

  useEffect(() => {
    setLandingMask(texture, areas?.layout, texture ? new Color(color).toArray() : null)
    // os uniformes mudam por fora do React: a cena parada (card C9) não desenharia o quadro novo
    invalidate()
    return () => {
      setLandingMask(null)
      invalidate()
    }
  }, [texture, areas, color, invalidate])

  return null
}
