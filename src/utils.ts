import KJUR from 'jsrsasign'

export function generateSignature(
  sessionName: string,
  role: number,
  sdkKey: string,
  sdkSecret: string,
) {
  const iat = Math.round(new Date().getTime() / 1000) - 30
  const exp = iat + 60 * 60 * 2
  const oHeader = { alg: 'HS256', typ: 'JWT' }

  const oPayload = {
    app_key: sdkKey,
    tpc: sessionName,
    role_type: role,
    version: 1,
    iat: iat,
    exp: exp,
  }

  const sHeader = JSON.stringify(oHeader)
  const sPayload = JSON.stringify(oPayload)
  const sdkJWT = KJUR.KJUR.jws.JWS.sign('HS256', sHeader, sPayload, sdkSecret)
  return sdkJWT
}
