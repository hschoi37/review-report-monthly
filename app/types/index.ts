export interface AnalysisResult {
  analysis: {
    summary: string
    insight: string
    sentiment: {
      positive: number
      neutral: number
      negative: number
    }
    pros: Array<{
      title: string
      content: string
    }>
    cons: Array<{
      title: string
      content: string
    }>
    keywords: Array<{
      tag: string
      is_positive: boolean
      desc: string
    }>
    action_plan: string[]
  }
  stats: {
    total_comments: number
    rating_avg: number
    daily_avg: number
    top_dates: Array<{
      date: string
      count: number
    }>
    sentiment_dist: {
      positive: number
      neutral: number
      negative: number
    }
  }
  neg_reviews: Array<{
    date: string
    rating: number
    content_zh?: string
    content_ko?: string
    reply_ko?: string
  }>
  meta: {
    franchise: string
    month: string
  }
}

export interface PrepareData {
  franchises: string[]
  months: string[]
  mapping: Record<string, string>
}

