/* O mapa das áreas com janela de pouso, pintado sobre a Lua: a grade fina no relevo do polo sul, e
 * a da Lua inteira na esfera.
 *
 * Não é uma malha a mais por cima do relevo: as máscaras vão para o shader da esfera e das malhas
 * do relevo (moonGlobe.js), e a mancha sai colada no chão, de perto e de longe, sem disputar
 * profundidade com as montanhas. Este componente só transforma o resultado da conta numa textura e liga ou
 * desliga o mapa.
 */
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { Color, DataTexture, LinearFilter, RedFormat, RepeatWrapping, UnsignedByteType } from 'three'

import { globalLandingMask, landingMask } from '../engine/landingGridFiles.js'
import { setGlobalLandingMask, setLandingMask } from './moonGlobe.js'

/* Uma máscara de um byte por quadrado vira textura. O filtro suave arredonda os cantos dos
   quadrados: a mancha fica com cara de área, e não de pixels. */
function maskTexture(mask, width, height) {
  const texture = new DataTexture(mask, width, height, RedFormat, UnsignedByteType)
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  texture.needsUpdate = true
  return texture
}

/* areas: o { flags, layout, global } do useLandingAreas, ou null com o mapa desligado ou ainda sem
   resultado. color: a cor das manchas, do token, lida pela cena. */
export function LandingAreasLayer({ areas, color }) {
  const invalidate = useThree((state) => state.invalidate)

  const texture = useMemo(
    () => (areas ? maskTexture(landingMask(areas.layout, areas.flags), areas.layout.columns, areas.layout.rows) : null),
    [areas],
  )
  useEffect(() => () => texture?.dispose(), [texture])

  // a máscara da Lua inteira dá a volta na longitude: a emenda em 0° lê a coluna do outro lado
  const globalTexture = useMemo(() => {
    if (!areas?.global) return null
    const { mask, width, height } = globalLandingMask(areas.global.layout, areas.global.flags)
    const built = maskTexture(mask, width, height)
    built.wrapS = RepeatWrapping
    return built
  }, [areas])
  useEffect(() => () => globalTexture?.dispose(), [globalTexture])

  useEffect(() => {
    const rgb = new Color(color).toArray()
    setLandingMask(texture, areas?.layout, texture ? rgb : null)
    setGlobalLandingMask(globalTexture, rgb)
    // os uniformes mudam por fora do React: a cena parada (card C9) não desenharia o quadro novo
    invalidate()
    return () => {
      setLandingMask(null)
      setGlobalLandingMask(null)
      invalidate()
    }
  }, [texture, globalTexture, areas, color, invalidate])

  return null
}
