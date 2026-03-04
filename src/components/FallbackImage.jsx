import { useState } from 'react'
import { Image as ImageIcon } from 'lucide-react'

export const FallbackImage = ({ src, alt, className, imgClassName = 'object-cover' }) => {
    const [error, setError] = useState(false)
    const [loading, setLoading] = useState(true)

    // Auto-detect GDrive links and restructure them for direct image rendering
    // since /uc?id= blocks direct embedding now. We use lh3.googleusercontent.com
    const processUrl = (url) => {
        if (!url) return ''
        const gdriveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
        if (gdriveMatch && gdriveMatch[1]) {
            return `https://lh3.googleusercontent.com/d/${gdriveMatch[1]}=w1000`
        }
        return url
    }

    const processedSrc = processUrl(src)

    if (error || !src) {
        return (
            <div className={`bg-white/5 flex flex-col items-center justify-center text-gray-500 ${className}`}>
                <ImageIcon size={32} className="mb-2 opacity-50" />
                <span className="text-xs text-center px-4">Image Unavailable</span>
            </div>
        )
    }

    return (
        <div className={`relative overflow-hidden bg-black/20 ${className}`}>
            {loading && (
                <div className="absolute inset-0 animate-pulse bg-white/5 flex items-center justify-center">
                    <ImageIcon size={24} className="opacity-20 animate-bounce" />
                </div>
            )}
            <img
                src={processedSrc}
                alt={alt}
                loading="lazy"
                decoding="async"
                className={`w-full h-full transition-all duration-700 ease-in-out ${imgClassName} ${loading ? 'opacity-0 scale-105 blur-lg' : 'opacity-100 scale-100 blur-0'}`}
                onLoad={() => setLoading(false)}
                onError={() => {
                    setError(true)
                    setLoading(false)
                }}
            />
        </div>
    )
}
