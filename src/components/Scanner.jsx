import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { X, Camera } from 'lucide-react'

export const Scanner = ({ onScan, onClose }) => {
    const html5QrCodeRef = useRef(null)

    const stopScanner = async () => {
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
            try {
                await html5QrCodeRef.current.stop()
                html5QrCodeRef.current.clear()
            } catch (err) {
                console.error("Unable to stop scanner", err)
            }
        }
    }

    useEffect(() => {
        const startScanner = async () => {
            try {
                const html5QrCode = new Html5Qrcode("reader")
                html5QrCodeRef.current = html5QrCode

                const config = { fps: 10, qrbox: { width: 250, height: 250 } }

                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        onScan(decodedText)
                        stopScanner()
                    },
                    () => {
                        // ignore scan errors
                    }
                )
            } catch (err) {
                console.error("Unable to start scanner", err)
            }
        }

        startScanner()

        return () => {
            if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
                html5QrCodeRef.current.stop().then(() => {
                    html5QrCodeRef.current.clear()
                }).catch(err => console.error("Error stopping scanner on unmount", err))
            }
        }
    }, [onScan])

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in" onClick={onClose}>
            <div 
                className="relative w-full max-w-md bg-surface border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-2">
                        <Camera className="text-primary" size={20} />
                        <h2 className="font-bold text-lg text-white">Scan QR Code</h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <div className="p-6">
                    <div id="reader" className="overflow-hidden rounded-xl border border-white/10 bg-black aspect-square"></div>
                    <p className="mt-4 text-center text-sm text-gray-400">
                        Position the QR code within the frame to scan
                    </p>
                </div>
                
                <div className="p-4 bg-white/5 text-center">
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    )
}
