import { getBirdImage } from "../utils/birdImages";

export default function BirdImageCard({ commonName, speciesCode }) {
  if (!commonName) return null;

  const imageSrc = getBirdImage({ commonName, speciesCode });

  return (
    <div className="bird-image-card">
      {imageSrc ? (
        <img
          className="bird-image-card-img"
          src={imageSrc}
          alt={`${commonName} bird image`}
          loading="lazy"
        />
      ) : (
        <div className="bird-image-card-img bird-image-card-placeholder" aria-hidden="true">
          <span className="bird-image-card-placeholder-text">Image pending</span>
        </div>
      )}
      <div className="bird-image-card-info">
        <span className="bird-image-card-label">Selected bird</span>
        <span className="bird-image-card-name">{commonName}</span>
        <span className="bird-image-card-caption">
          {imageSrc ? "Curated reference image" : "Reference image coming soon"}
        </span>
      </div>
    </div>
  );
}
