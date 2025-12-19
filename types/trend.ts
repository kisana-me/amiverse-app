export type TrendType = {
  category: string
  image_url: string
  title: string
  overview: string
  last_updated_at: Date
  ranking: {
    word: string
    count: number
  }[]
}
