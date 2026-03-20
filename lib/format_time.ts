export const formatRelativeTime = (date: Date) => {
  date = new Date(date);
  if (isNaN(date.getTime())) return "?";

  const now = Date.now();
  const diffInSeconds = Math.floor((now - date.getTime()) / 1000);

  const hasRtf =
    typeof Intl !== "undefined" &&
    typeof Intl.RelativeTimeFormat === "function";

  const formatJaFallback = (value: number, unit: string) => {
    const abs = Math.abs(value);
    if (abs <= 0) return "たった今";
    return `${abs}${unit}前`;
  };

  if (diffInSeconds < 60) {
    if (hasRtf) {
      try {
        const rtf = new Intl.RelativeTimeFormat("ja", { numeric: "auto" });
        return rtf.format(-diffInSeconds, "second");
      } catch {
        // fall through
      }
    }
    return formatJaFallback(diffInSeconds, "秒");
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    if (hasRtf) {
      try {
        const rtf = new Intl.RelativeTimeFormat("ja", { numeric: "auto" });
        return rtf.format(-diffInMinutes, "minute");
      } catch {
        // fall through
      }
    }
    return formatJaFallback(diffInMinutes, "分");
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    if (hasRtf) {
      try {
        const rtf = new Intl.RelativeTimeFormat("ja", { numeric: "auto" });
        return rtf.format(-diffInHours, "hour");
      } catch {
        // fall through
      }
    }
    return formatJaFallback(diffInHours, "時間");
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    if (hasRtf) {
      try {
        const rtf = new Intl.RelativeTimeFormat("ja", { numeric: "auto" });
        return rtf.format(-diffInDays, "day");
      } catch {
        // fall through
      }
    }
    return formatJaFallback(diffInDays, "日");
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    if (hasRtf) {
      try {
        const rtf = new Intl.RelativeTimeFormat("ja", { numeric: "auto" });
        return rtf.format(-diffInMonths, "month");
      } catch {
        // fall through
      }
    }
    return formatJaFallback(diffInMonths, "か月");
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  if (hasRtf) {
    try {
      const rtf = new Intl.RelativeTimeFormat("ja", { numeric: "auto" });
      return rtf.format(-diffInYears, "year");
    } catch {
      // fall through
    }
  }
  return formatJaFallback(diffInYears, "年");
};

export const formatFullDate = (date: Date) => {
  const year = date.getFullYear();
  const month = ("0" + (date.getMonth() + 1)).slice(-2);
  const day = ("0" + date.getDate()).slice(-2);
  const hours = date.getHours();
  const minutes = ("0" + date.getMinutes()).slice(-2);
  const seconds = ("0" + date.getSeconds()).slice(-2);
  return `${year}年 ${month}月 ${day}日 ${hours}時 ${minutes}分 ${seconds}秒`;
};
