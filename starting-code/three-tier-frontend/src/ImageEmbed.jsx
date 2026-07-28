export default function ImageEmbed({ url, alt }) {
  if (!url) return null
  return (
    <div className="image-embed">
      <img src={url} alt={alt || ''} loading="lazy" />
    </div>
  )
}
