interface FavoriteStarProps {
  favorite: boolean
  onToggle: () => void
}

/** 我的最愛切換星號。實心=已收藏。 */
export default function FavoriteStar({ favorite, onToggle }: FavoriteStarProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      title={favorite ? '取消最愛' : '加入最愛'}
      aria-pressed={favorite}
      className={`text-lg leading-none ${
        favorite ? 'text-amber-400 hover:text-amber-500' : 'text-slate-300 hover:text-amber-400'
      }`}
    >
      {favorite ? '★' : '☆'}
    </button>
  )
}
