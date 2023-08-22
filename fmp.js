/**
 * 首屏加载时间计算
 */

// 屏幕高度
const windowHeight = window.innerHeight
// 记录dom更新时的分数和时间
const scoreArr = []
// 记录首屏图片地址
const firstImgArr = []
// 定时检查间隔
const checkInterval = 500

class Perf {
	constructor(options) {
		// dom观察
		this.observer = null
		// 默认30s
		this.fmp = 30000
		// 定时器
		this.timer = null
		this.options = options
		this.init()
	}

	// 初始化
	init() {
		this.mutationObserver()
	}
	// 监听dom变化
	mutationObserver() {
		this.observer && this.observer.disconnect();
		this.observer = new MutationObserver((list) => {
			const t = new Date() - performance.timing.fetchStart
			const body = document.body;
			// console.log(list, 'list')
			scoreArr.push({
				score: body ? this.calculateScore(body, 1, false) : 0,
				t
			})
			console.log(scoreArr, 'scoreArr')
		})
		this.observer.observe(document, {
			childList: true,
			subtree: true
		})
		if (document.readyState === "complete") {
			// 文档加载完成状态
			this.calculateFinalScore()
		} else {
			// 监听页面加载情况
			window.addEventListener("load", () => {
				this.calculateFinalScore();
			}, true);
		}
	}

	// 计算每次dom变化所有子节点的分数
	calculateScore(el, tiers, parentScore) {
		try {
			let score = 0;
			const tagName = el.tagName;
			if ("SCRIPT" !== tagName && "STYLE" !== tagName && "META" !== tagName && "HEAD" !== tagName) {
				const childrenLen = el.children ? el.children.length : 0;
				if (childrenLen > 0) {
					for (let childs = el.children, len = childrenLen - 1; len >= 0; len--) {
						score += this.calculateScore(childs[len], tiers + 1, score > 0);
					}
				}
				if (score <= 0 && !parentScore) {
					if (!(el.getBoundingClientRect && el.getBoundingClientRect().top < windowHeight)) {
						return 0
					};
				}
				score += 1 + .5 * tiers;
			}
			return score;
		} catch (error) {
		}
	}

	// 计算最终分数
	calculateFinalScore() {
		this.filterScore()
		let isCheckFmp = false
		// 当前时间减去页面开始加载前时间
		const time = Date.now() - performance.timing.fetchStart;
		// 判断是否超过30s,超过则默认dom更新完毕
		if (time > 30000) isCheckFmp = true
		// 判断打点超过1个(之前4个)&&当前时间减去最后一个dom更新的时间差，如果大于1s，则默认dom已经更新完毕
		console.log(time, time - (scoreArr[scoreArr.length - 1].t), 2 * checkInterval)
		if (scoreArr && scoreArr.length && scoreArr.length > 4 && time > 10000 && time - (scoreArr[scoreArr.length - 1].t || 0) > 2 * checkInterval) isCheckFmp = true;
		// 判断onload时间是否执行完成 && 打点超过10个 && 最后一个dom更新的分数，跟倒数第9个dom的分数看是否一直，如果一致，则表示dom已经不在变化
		if (window.performance.timing.loadEventEnd !== 0 && scoreArr.length > 10 && scoreArr[scoreArr.length - 1].score === scoreArr[scoreArr.length - 9].score) isCheckFmp = true
		if (isCheckFmp) {
			this.observer.disconnect();
			const record = this.getMaxChangeDom()
			if (record) this.fmp = record?.t.toFixed()
			clearTimeout(this.timer)
			this.timer = null
			getAllImg(document.body)
			const imgFmp = this.getMaxImgLoadTime().toFixed()
			console.log('fmp:' + this.fmp)
			this.fmp < imgFmp ? this.fmp = imgFmp : ''
			console.log('imgFmp:' + this.fmp)
			this.options.getFmp && typeof this.options.getFmp === 'function' && this.options.getFmp(this.fmp)
		} else {
			// console.log(time)
			clearTimeout(this.timer)
			this.timer = setTimeout(() => {
				this.calculateFinalScore()
			}, checkInterval)
		}
	}

	// 过滤掉前一个dom更新的分数比上个dom更新的分数的情况
	filterScore() {
		try {
			for (let index = 1; index < scoreArr.length; index++) {
				if (scoreArr[index].score < scoreArr[index - 1].score) {
					scoreArr.splice(index, 1)
				}
			}
		} catch (error) {
			console.log(error)
		}
	}

	// 获取变化最大的dom打点
	getMaxChangeDom() {
		let record = null
		for (let index = 1; index < scoreArr.length; index++) {
			const diffScore = scoreArr[index].score - scoreArr[index - 1].score
			if (!record || diffScore >= record.diff) {
				record = {
					t: scoreArr[index].t,
					diff: diffScore
				}
			}
		}
		return record
	}

	// 获取图片加载最长时间
	getMaxImgLoadTime() {
		const allImgTime = []
		for (let index = 0; index < firstImgArr.length; index++) {
			try {
				allImgTime.push(performance.getEntriesByName(firstImgArr[index])[0].responseEnd || 0)
			} catch (error) {
				// console.log(error)
			}
		}
		return allImgTime.length > 0 ? Math.max(...allImgTime) : 0
	}
}

// 获取首屏的所有图片地址
function getAllImg(el) {
	const tagName = el.tagName;
	const childList = el.children;
	if (tagName !== 'BODY' && tagName !== 'SCRIPT' && tagName !== 'STYLE' && tagName !== 'HEAD') {
		if (!(el.getBoundingClientRect && el.getBoundingClientRect().top < windowHeight)) return;
		if (tagName === 'IMG') {
			firstImgArr.push(el.src)
		} else {
			const style = el.currentStyle || window.getComputedStyle(el, false)
			if (style.backgroundImage !== 'none') {
				firstImgArr.push(style.backgroundImage.slice(4, -1).replace(/"/g, ""))
			}
		}
	}
	for (let index = 0; index < childList.length; index++) {
		getAllImg(childList[index])
	}
}

// 调用
new Perf({
	getFmp: (fmp) => {
		console.log('获取fmp时长:' + fmp)
	}
})


