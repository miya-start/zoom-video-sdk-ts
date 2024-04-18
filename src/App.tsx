import React from 'react'
import ZoomVideo, { VideoQuality, type MediaDevice } from '@zoom/videosdk'
import { generateSignature } from './utils'
import headsetKittyBlack from './assets/headset-kitty-black.avif'
import headsetKittyBlue from './assets/headset-kitty-blue.jpeg'
import headsetKittyPink from './assets/headset-kitty-pink.avif'
import qrcodeDummy from './assets/qrcode-dummy.png'

const sdkKey = import.meta.env.VITE_SDK_KEY
const sdkSecret = import.meta.env.VITE_SDK_SECRET

const topic = 'SomeTopicName'
const role = 1
const username = `User-${new Date().getTime().toString().slice(6)}`

const client = ZoomVideo.createClient()
await client.init('ja-JP', 'Global', { patchJsMedia: true })

const App: React.FC = () => {
  const [isConnected, setIsConnected] = React.useState(false)
  const [isConnecting, setIsConnecting] = React.useState(false)
  const [isMuted, setIsMuted] = React.useState(false)
  const videoRef = React.useRef<HTMLDivElement>(null)
  const [selectedGift, setSelectedGift] = React.useState<string | null>(null)
  const [cameras, setCameras] = React.useState<MediaDevice[]>([])
  const [selectedCamera, setSelectedCamera] = React.useState<string | null>(
    null,
  )

  React.useEffect(() => {
    const mediaStream = client.getMediaStream()
    setCameras(mediaStream.getCameraList())

    client.on('device-change', () => {
      console.log(mediaStream.getCameraList())
      setCameras(mediaStream.getCameraList())
    })
  }, [])

  const switchCamera = async (deviceId: string) => {
    const mediaStream = client.getMediaStream()
    await mediaStream.switchCamera(deviceId)
    setSelectedCamera(deviceId)
  }

  const openGiftModal = (giftId: string) => {
    setSelectedGift(giftId)
  }

  const closeGiftModal = () => {
    setSelectedGift(null)
  }

  const renderVideo = React.useCallback(
    async (event: { action: string; userId: number }) => {
      const mediaStream = client.getMediaStream()
      if (event.action === 'Start') {
        const userVideo = await mediaStream.attachVideo(
          event.userId,
          VideoQuality.Video_1080P,
        )
        if (userVideo instanceof HTMLElement) {
          videoRef.current?.appendChild(userVideo)
        }
      } else {
        const element = await mediaStream.detachVideo(event.userId)
        Array.isArray(element)
          ? element.forEach((el) => el.remove())
          : element?.remove()
      }
    },
    [],
  )

  const UseWorkAroundForSafari = async (client: any) => {
    let audioDecode: boolean
    let audioEncode: boolean
    client.on('media-sdk-change', (payload: any) => {
      if (payload.type === 'audio' && payload.result === 'success') {
        if (payload.action === 'encode') {
          audioEncode = true
        } else if (payload.action === 'decode') {
          audioDecode = true
        }
        if (audioEncode && audioDecode) {
          client.getMediaStream().startAudio()
        }
      }
    })
  }

  const toggleAudio = async () => {
    const mediaStream = client.getMediaStream()
    if (isMuted) {
      await mediaStream.unmuteAudio()
      setIsMuted(false)
    } else {
      await mediaStream.muteAudio()
      setIsMuted(true)
    }
  }

  const startCall = async () => {
    setIsConnecting(true)
    const token = generateSignature(topic, role, sdkKey, sdkSecret)
    client.on('peer-video-state-change', renderVideo)
    await client.join(topic, token, username)

    const mediaStream = client.getMediaStream()
    await mediaStream.startVideo({ fullHd: true })

    await renderVideo({
      action: 'Start',
      userId: client.getCurrentUserInfo().userId,
    })
    setIsConnected(true)
    setIsConnecting(false)

    if (
      navigator.userAgent.indexOf('Safari') !== -1 &&
      navigator.userAgent.indexOf('Chrome') === -1
    ) {
      await UseWorkAroundForSafari(client)
    } else {
      await mediaStream.startAudio()
    }
  }
  const leaveCall = async () => {
    client.off('peer-video-state-change', renderVideo)
    const mediaStream = client.getMediaStream()
    for (const user of client.getAllUser()) {
      const element = await mediaStream.detachVideo(user.userId)
      Array.isArray(element)
        ? element.forEach((el) => el.remove())
        : element.remove()
    }
    await client.leave()
    setIsConnected(false)
    setIsMuted(false)
  }

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-4xl font-bold text-center py-8">
        Zoom VideoSDK のデモ
      </h1>
      <div className="flex space-x-4 mb-4">
        {!isConnected ? (
          <button
            className="bg-blue-500 text-white font-bold text-lg py-4 px-8 rounded-md w-64"
            onClick={startCall}
            disabled={isConnecting}
          >
            {isConnecting ? '接続中...' : '参加'}
          </button>
        ) : (
          <>
            <button
              className="bg-blue-500 text-white font-bold text-lg py-4 px-8 rounded-md w-64"
              onClick={leaveCall}
            >
              退出
            </button>

            <button
              className="bg-blue-500 text-white font-bold text-lg py-4 px-8 rounded-md w-64"
              onClick={toggleAudio}
            >
              {isMuted ? 'ミュート解除' : 'ミュート'}
            </button>
            <div className="flex flex-col items-center">
              <select
                className="bg-white text-black font-bold py-2 px-4 rounded"
                value={selectedCamera || ''}
                onChange={(e) => switchCamera(e.target.value)}
              >
                {cameras.map((camera) => (
                  <option key={camera.deviceId} value={camera.deviceId}>
                    {camera.label}
                  </option>
                ))}
              </select>
              <span className="text-sm mt-1">カメラの切り替え</span>
            </div>
          </>
        )}
      </div>
      <video-player-container ref={videoRef}></video-player-container>

      {isConnected && (
        <div className="flex space-x-4 mt-4">
          <div className="flex flex-col items-center">
            <button
              className=" text-white rounded-full p-4"
              onClick={() => openGiftModal('headsetKittyPink')}
            >
              <img src={headsetKittyPink} alt="Gift 1" className="w-16 h-16" />
            </button>
            <span className="text-sm mt-1">ヘッドセット ピンク</span>
          </div>

          <div className="flex flex-col items-center">
            <button
              className=" text-white rounded-full p-4"
              onClick={() => openGiftModal('headsetKittyBlue')}
            >
              <img src={headsetKittyBlue} alt="Gift 1" className="w-16 h-16" />
            </button>
            <span className="text-sm mt-1">ヘッドセット ブルー</span>
          </div>

          <div className="flex flex-col items-center">
            <button
              className=" text-white rounded-full p-4"
              onClick={() => openGiftModal('headsetKittyBlack')}
            >
              <img src={headsetKittyBlack} alt="Gift 1" className="w-16 h-16" />
            </button>
            <span className="text-sm mt-1">ヘッドセット ブラック</span>
          </div>
        </div>
      )}

      {selectedGift && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-gray-900 opacity-50"></div>
          <div className="bg-white rounded-lg p-8 z-10">
            <h2 className="text-2xl font-bold mb-4">ギフトを購入</h2>
            <p className="mb-4 flex justify-center">
              <img
                src={
                  selectedGift === 'headsetKittyPink'
                    ? headsetKittyPink
                    : selectedGift === 'headsetKittyBlue'
                    ? headsetKittyBlue
                    : headsetKittyBlack
                }
                alt={selectedGift}
                className="w-32 h-32"
              />
            </p>
            <p className="mb-4">
              QRコードをスキャンして支払いを完了してください
            </p>
            <img
              src={qrcodeDummy}
              alt="QR Code for Payment"
              className="w-64 h-64 mx-auto"
            />
            <div className="flex justify-end">
              <button
                className="bg-gray-500 text-white font-bold py-2 px-4 rounded mr-2"
                onClick={closeGiftModal}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
