const data = {
    weeks: {},
    plays: [],

    introStage: 0,
    weekStage: 0,

    startMoney: 300,

    stockXFee: 0.125,
    tax: 0.08,
    shipping: 10,

    maxQty: 3,
    allowSkips: true,

    daysBeforeSale: 4,
    percentile: 0.33,

    game: {
        money: 0,
        plays: []
    },

    cheaterMode: false
}

function getPercentile(releaseDate, history, daysBeforeSale, percentile) {
    if (history.series[0].data.length < 30) return [0, 0]
    const earliest = Date.parse(releaseDate) + 1000 * 60 * 60 * 24 * daysBeforeSale;
    const data = history.series[0].data.sort(([aT, aP], [bT, bP]) => {
        return aP - bP;
    }).filter(([aT, aP]) => aT > earliest);
    return data[Math.floor(percentile * (data.length - 1))]
}

function computeResell(releaseDate, history, config) {
    try {
        return getPercentile(releaseDate,
            JSON.parse(history), config.daysBeforeSale, config.percentile)[1] * (1 - config.stockXFee);
    } catch (e) {
        console.log(history);
        return 0;
    }
}

function itemResell(item, config) {
    return {
        item: item, 
        cw: item.prices
        .map(({name, history, media}) => ({name, media, resell: computeResell(item.item.releaseDate, history, config)}))
        .sort((iA, iB) => iA.resell - iB.resell)
        .pop()
    };
}

function two(n) {
    return Number.parseFloat(n.toFixed(2))
}

function computeProfit(money, config, item) {
    const purchasePrice = item.item.price * (1 + config.tax) + config.shipping;
    const qty = Math.min(Math.floor(money / purchasePrice), config.maxQty);
    const totalPurchase = purchasePrice * qty;

    const resell = itemResell(item, config);
    const returnAmt = resell.cw.resell * qty;

    return {
        item: item.item,
        cw: resell.cw,
        profit: two(returnAmt - totalPurchase),
        qty,
        profitPer: two(qty ? (returnAmt - totalPurchase) / qty : 0)
    }
}

function bestItem(week, money, config) {
    return week.filter(item => item.prices.length > 0)
        .map(computeProfit.bind(undefined, money, config))
        .filter((i, _, profits) => !profits.some(p => p.qty) || (i.qty > 0))
        .sort((iA, iB) => iA.profit - iB.profit)
        .pop();
}

function seasonPlays(season, config) {
    let money = config.startMoney;
    let plays = [];
    for(let week of season) {
        if(!week) continue;
        let item = bestItem(week, money, config);
        if((item.profit >= 0 || !config.allowSkips)) {
            money += item.profit;
            money = two(money);
        }
        plays.push({
            week: item.item.releaseWeek,
            skip: (item.profit < 0 && config.allowSkips ) || item.qty == 0,
            item,
            money
        });
    }
    return plays;
}

Vue.component('cwpicker', {
    props: ['item'],
    template: `<div class="cw-picker">
        <ul>
            <li v-for="price in item.prices" v-on:click.stop="$emit('choice', price)">{{ price.name.trim() }}</li>
        </ul>
    </div>`
})

Vue.component('item', {
    props: ['item', 'selectedItem', 'money', 'taxNShip'],
    computed: {
        thumb: function() {
            try {
                return this.item.prices[0].media.thumbUrl || srhConstants.qMark;
            } catch (e) {
                return srhConstants.qMark;
            }
        },
        isChosen: function() {
            return this.selectedItem && this.selectedItem.id === this.item.item.id
        },
        cantChoose: function() {
            return this.money < this.computeRetail(this.item.item.price);
        },
        canBuyQty: function() {
            return Math.floor(this.money / this.computeRetail(this.item.item.price));
        }
    },
    methods: {
        choose: function(choice) {
            // todo handle choice
            this.pickCw = false;
            this.$emit('itemChoice', {
                item: this.item.item,
                choice
            })
        },
        computeRetail: function(price) {
            return two(price * (1 + this.taxNShip.tax) + this.taxNShip.shipping); 
        }
    },
    data: function() {
        return {
            pickCw: false
        }
    },
    template: `<div class="item" v-on:click="pickCw = !cantChoose && !pickCw" 
            v-bind:class="{chosen: isChosen, cantChoose: cantChoose}">
        <img v-bind:src="thumb" onerror="this.src = srhConstants.qMark;"></img><br>
        <span>{{item.item.name}}</span><br>
        <span>\${{item.item.price}} (\${{computeRetail(item.item.price)}})</span><br>
        <span>Can buy {{canBuyQty}}</span>
        <cwpicker v-if="pickCw" v-bind:item="item" v-on:choice="choose($event)"/>
    </div>`
})

Vue.component('play', {
    props: ['play'],
    data: function() {
        return {
            hover: false
        }
    },
    computed: {
        isProfitable: function() {
            return !this.play.item || this.play.item.profit > 0;
        },
        image: function() {
            try {
                return this.play.item.cw.media.smallImageUrl || srhConstants.qMark;
            } catch (e) {
                return srhConstants.qMark;
            }
        }
    },
    template: `<div class="play" v-bind:class="{profitable:isProfitable, skip:play.skip}"
        @mouseover="hover = true"
        @mouseleave="hover = false">
        <div v-if="play.item">
            <span>Week {{play.week}}: {{play.item.qty}}x {{play.item.cw.name}}</span> <br>
            <span>\${{play.item.profitPer}} profit per, for total profit of \${{play.item.profit}}</span><br>
            <span>End with \${{play.money}}</span>
        </div>
        <div v-if="!play.item">
            <span>Week {{play.week}}: SKIP</span>
            <span>End with \${{play.money}}</span>
        </div>
        <div v-show="hover" class="play-image">
            <img v-bind:src="image" onerror="this.src = srhConstants.qMark;"></img>
        </div>
    </div>`
})

Vue.component('week', {
    props: ['week', 'taxNShip', 'money'],
    data: function() {
        return {
            selected: undefined,
            selectedItem: undefined,
            choice: undefined
        }
    },
    methods: {
        choose: function(itemChoice) {
            this.selectedItem = itemChoice.item
            this.choice = itemChoice;
        },
        lock: function(isSkip) {
            if(!isSkip && !this.choice) return;
            if(isSkip) {
                this.$emit('choice', {
                    skip:true,
                    weekNum: this.weekInfo.weekNum
                })
            } else {
                this.$emit('choice', {
                    skip: false,
                    weekNum: this.weekInfo.weekNum,
                    choice: this.choice
                });
            }
        }
    },
    computed: {
        showItems: function() {
            return this.week.filter(item => item.prices.length > 0)
        },
        weekInfo: function() {
            let {releaseWeek, releaseDate} = this.week[0].item;
            return {
                weekNum: releaseWeek,
                date: releaseDate
            }
        },
        continueDisabled: function() {
            return !this.selectedItem
        }
    },
    template: `<div class="week-card">
        <h1>Week {{weekInfo.weekNum}} - {{weekInfo.date}}</h1>
        <p>Choose one item, or SKIP at the bottom. 
        After clicking on an item you will have a chance to choose a colorway.</p>

        <item v-for="item in showItems" v-bind:item="item" v-on:itemChoice="choose($event)"
            v-bind:selectedItem="selectedItem" v-bind:taxNShip="taxNShip" v-bind:money="money"/>
        
        <div style="
            width: 100%;
            display: inline-block;
        ">
        <br>
        <span v-on:click="lock(false)" class="next-button" 
            v-bind:class="{disabled:continueDisabled}">Confirm</span>

        <span v-on:click="lock(true)" class="next-button">Skip Week</span>
        </div>

        <div class="spacer" style="clear: both;"></div>
    </div>`
})

const app = new Vue({
    el: "#game",
    data,
    /*watch: Object.keys(data).filter(key => key != 'file').reduce((obj, key) => {
        obj[key] = parse;
        return obj;
    }, {file() {
        fetch(this.file)
            .then(res => res.text())
            .then(text => this.fileContents = text)
            // .then(parse.bind(this))
    }}),*/
    mounted() {
        fetch(`histories.json`)
            .then(res => res.text())
            .then(text => JSON.parse(text))
            .then(history => history.map(entry => [entry.item.releaseWeek, entry]))
            .then(history => history.reduce((acc, [week, entry]) => {
                if(!acc[week]) acc[week] = [];
                acc[week].push(entry); 
                return acc;
            }, []))
            .then(weeks => this.weeks = weeks)
            // .then(parse.bind(this))
    },
    computed: {
        taxNShip: function() {
            return {
                tax: parseFloat(this.tax),
                shipping: parseFloat(this.shipping)
            }
        },
        gameMoney: function() {
            return parseFloat(this.game.money);
        }
    },
    methods: {
        // https://stackoverflow.com/questions/13627308/add-st-nd-rd-and-th-ordinal-suffix-to-a-number/13627586
        ord: function ordinal_suffix_of(x) {
            let i = Math.round(x * 100);
            var j = i % 10,
                k = i % 100;
            if (j == 1 && k != 11) {
                return i + "st";
            }
            if (j == 2 && k != 12) {
                return i + "nd";
            }
            if (j == 3 && k != 13) {
                return i + "rd";
            }
            return i + "th";
        },
        nextStage: function() {
            this.introStage++;
            if(this.introStage >= 6) {
                this.plays = seasonPlays(this.weeks, this);
                this.game.money = this.startMoney;
            }
        },
        nextWeek: function(choice) {
            if(!choice.skip) {
                const profit = computeProfit(this.game.money, this, {
                    item: choice.choice.item,
                    prices: [choice.choice.choice]
                });
                this.game.money = two(this.game.money + profit.profit);
                this.game.plays.push({
                    week: choice.weekNum,
                    skip: false,
                    item: profit,
                    money: this.game.money
                })
            } else {
                this.game.plays.push({
                    week: choice.weekNum,
                    skip: true,
                    money: this.game.money
                });
            }
            this.weekStage++;
            while(!this.weeks[this.weekStage] && this.weekStage < this.weeks.length) {
                this.weekStage++;
            }
        },
        getWeekNum(week) {
            return week ? parseInt(week[0].item.releaseWeek) : -1;
        }
    }
})