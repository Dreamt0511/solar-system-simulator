/**
 * 实时位置计算器
 * 基于 NASA JPL 历元数据推算各天体当前真实轨道位置
 * 在初始化时计算一次，使模拟从真实位置开始
 *
 * 原理：
 *   当前平近点角 = 历元平近点角 + 360° × (当前JD - 历元JD) / 真实公转周期
 *
 * 历元数据来源：2026-06-07 JPL HORIZONS API 查询结果
 */

// 参考历元：2026-06-07 00:00 TDB
const REFERENCE_JD = 2461198.5;

// 历元平近点角 MA（度）与真实公转周期 P（天）
// ⚠️ 精度说明：线性外推随天数增大而衰减，月球尤其敏感（周期仅27天）。
//    建议每半年重新从 JPL HORIZONS (https://ssd.jpl.nasa.gov/horizons)
//    获取当前 MA 更新此数据。
const EPOCH_DATA = {
    mercury:  { ma: 80.14,  period: 87.97 },
    venus:    { ma: 36.69,  period: 224.70 },
    earth:    { ma: 151.23, period: 365.25 },
    mars:     { ma: 38.11,  period: 687.00 },
    jupiter:  { ma: 102.12, period: 4332.59 },
    saturn:   { ma: 280.84, period: 10759.22 },
    uranus:   { ma: 260.52, period: 30688.40 },
    neptune:  { ma: 312.37, period: 60182.00 },
    moon:     { ma: 276.40, period: 27.32 },
    pluto:    { ma: 55.96,  period: 90560.00 },
    ceres:    { ma: 273.99, period: 1681.60 }
};

/**
 * 日期转儒略日
 */
function dateToJD(date) {
    return date.getTime() / 86400000 + 2440587.5;
}

/**
 * 获取所有天体当前的平近点角（度）
 * 每次页面加载时调用一次
 * @returns {Object<string, number>}
 */
export function getCurrentMeanAnomalies() {
    const now = new Date();
    const currentJD = dateToJD(now);
    const deltaDays = currentJD - REFERENCE_JD;
    const result = {};

    for (const [key, data] of Object.entries(EPOCH_DATA)) {
        let M = data.ma + 360 * deltaDays / data.period;
        // 归一化到 0-360
        M = ((M % 360) + 360) % 360;
        result[key] = M;
    }

    return result;
}

