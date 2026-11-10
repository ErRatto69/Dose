import React, { useState } from 'react';
import { Wine } from 'lucide-react';

interface DrinkThumbnailProps {
    imageUrl?: string | null;
    alt: string;
    sizeClass?: string;
    iconClass?: string;
}

export const DrinkThumbnail: React.FC<DrinkThumbnailProps> = ({
    imageUrl,
    alt,
    sizeClass = 'w-16 h-16 rounded-xl',
    iconClass = 'w-6 h-6',
}) => {
    const [failedUrl, setFailedUrl] = useState<string | null>(null);
    const hasImage = Boolean(imageUrl) && failedUrl !== imageUrl;

    return (
        <div
            className={`${sizeClass} overflow-hidden bg-[#0c0c0f] border border-white/[0.08] flex items-center justify-center shrink-0`}
        >
            {hasImage && imageUrl ? (
                <img
                    src={imageUrl}
                    alt={alt}
                    loading="lazy"
                    onError={() => setFailedUrl(imageUrl)}
                    className="w-full h-full object-cover"
                />
            ) : (
                <Wine className={`${iconClass} text-zinc-600 stroke-[1.5]`} aria-hidden="true" />
            )}
        </div>
    );
};
