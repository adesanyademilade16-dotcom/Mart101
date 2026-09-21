import { X } from "lucide-react";

interface ImageLightboxProps {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
}

const ImageLightbox = ({ src, alt, open, onClose }: ImageLightboxProps) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
        aria-label="Close"
      >
        <X className="w-7 h-7" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-full rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

export default ImageLightbox;
