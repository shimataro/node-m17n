/*! node-m17n by shimataro */
module.exports = (function(undefined)
{
	"use strict";

	let languages = {};
	let regions = {};
	let messages = {};
	let fallback = null;

	_m17n.configure = _configureFunction;
	return _m17n;

	/**
	 * m17nオブジェクトを生成
	 * @param {Object} requests リクエスト情報; "ietf", "acceptLanguage", "fallback"の中ではじめに見つかったものを返す
	 * @return {{lang_tag: string, region_tag: string, lang: Object, region: Object, _: Object}} m17nオブジェクト
	 * @private
	 */
	function _m17n(requests)
	{
		const tag = _findLanguageByRequests(requests, fallback);

		return {
			lang_tag: tag.lang,
			region_tag: tag.region,
			lang: languages[tag.lang],
			region: regions[tag.region],
			_: messages[tag.message],
		};
	}

	/**
	 * 設定関数
	 * @param {Object} options オプション
	 * @private
	 */
	function _configureFunction(options)
	{
		const path = require("path");

		languages = _loadYaml(options.dirLanguages || path.join(__dirname, "languages"));
		regions = _loadYaml(options.dirRegions || path.join(__dirname, "regions"));
		messages = _loadYaml(options.dirMessages);
		fallback = options.fallback;
		_functionizeMessage(messages);
	}

	/**
	 * 指定ディレクトリ内のYAMLファイルをロード
	 * @param {string} dirname ロード対象のディレクトリ
	 * @return {Object} ファイルタイトル: パース結果
	 * @private
	 */
	function _loadYaml(dirname)
	{
		const fs = require("fs");
		const path = require("path");
		const yaml = require("node-yaml");
		const files = fs.readdirSync(dirname);

		let result = {};
		files.forEach(function(filename)
		{
			if(!/\.yaml$/i.test(filename))
			{
				return;
			}

			const posTitle = filename.lastIndexOf(".");
			const title = filename.substring(0, posTitle);

			result[title] = yaml.readSync(path.join(dirname, filename));
		});

		// "language-region"形式のものは"language"形式の差分とみなす
		for(let k in result)
		{
			const pos = k.indexOf("-");
			if(pos < 0)
			{
				continue;
			}

			const l = k.substring(0, pos);
			result[k] = Object.assign({}, result[l], result[k]);
		}
		return result;
	}

	/**
	 * リクエスト情報から最適な言語を取得
	 * @param {Object} requests リクエスト情報
	 * @param {string} fallback フォールバック用言語
	 * @return {Object} タグ情報
	 * @private
	 */
	function _findLanguageByRequests(requests, fallback)
	{
		// 言語タグ直接指定（"?hl=ja-JP"のようなクエリストリング）
		if(requests.ietf !== undefined)
		{
			const tag = _getLanguageByIETF(requests.ietf);
			if(tag !== null)
			{
				return tag;
			}
		}

		// acceptLanguage指定（リクエストヘッダから自動判別）
		if(requests.acceptLanguage !== undefined)
		{
			const tag = _findLanguageByAcceptLanguage(requests.acceptLanguage);
			if(tag !== null)
			{
				return tag;
			}
		}

		// フォールバック
		if(requests.fallback !== undefined)
		{
			const tag = _getLanguageByIETF(requests.fallback);
			if(tag !== null)
			{
				return tag;
			}
		}

		// 最後のフォールバック（ここは必ず成功させること！）
		return _getLanguageByIETF(fallback);
	}

	/**
	 * 指定のIETF言語タグが最適な言語なら言語情報を取得
	 * @param {string} ietf IETF言語タグ; "language" or "language-region"
	 * @return {Object|null} タグ情報 or null
	 * @private
	 */
	function _getLanguageByIETF(ietf)
	{
		const lang = _getBestTagInObject(languages, ietf);
		if(lang === null)
		{
			return null;
		}

		const message = _getBestTagInObject(messages, ietf);
		if(message === null)
		{
			return null;
		}

		// "-"がなければデフォルトリージョンを設定
		const parts = ietf.split("-");
		if(parts.length < 2)
		{
			parts.push(languages[lang].defaultRegion);
		}

		const region = parts[1];
		if(regions[region] === undefined)
		{
			return null;
		}

		return {
			lang: lang,
			region: region,
			message: message,
		};
	}

	/**
	 * Accept-Languageからi18n/l10n/メッセージデータの各情報を取得
	 * @param {string} acceptLanguage Accept-Languageリクエストヘッダ
	 * @return {Object|null} タグ情報 or null
	 * @private
	 */
	function _findLanguageByAcceptLanguage(acceptLanguage)
	{
		const ietfs = acceptLanguage.split(",");
		for(let i = 0; i < ietfs.length; i++)
		{
			// ";"の前を取り出す
			const ietf = ietfs[i].split(";")[0].toLowerCase();

			const found = _getLanguageByIETF(ietf);
			if(found !== null)
			{
				return found;
			}
		}
		return null;
	}

	/**
	 * オブジェクト内の最適な言語タグを選択
	 * @param {Object} targetObject 言語情報 or メッセージ情報
	 * @param {string} ietf IETF言語タグ; "language" or "language-region"
	 * @return {string|null} 言語タグ情報
	 * @private
	 */
	function _getBestTagInObject(targetObject, ietf)
	{
		if(targetObject[ietf] !== undefined)
		{
			// 言語タグと完全一致
			return ietf;
		}

		const parts = ietf.split("-");
		if(targetObject[parts[0]] !== undefined)
		{
			// "language"部分に一致
			return parts[0];
		}
		return null;
	}

	/**
	 * オブジェクト内の文字列を関数化
	 * @param {Object} obj 対象オブジェクト
	 * @private
	 */
	function _functionizeMessage(obj)
	{
		for(let key in obj)
		{
			let val = obj[key];
			if(typeof(val) === "object")
			{
				_functionizeMessage(val);
				continue;
			}
			if(typeof(val) === "string")
			{
				obj[key] = _messageFunction(val);
			}
		}
	}

	/**
	 * メッセージの関数化
	 * @param {string} message メッセージ
	 * @return {Function} 関数化されたメッセージ
	 * @private
	 */
	function _messageFunction(message)
	{
		return function(replacement)
		{
			if(replacement === undefined)
			{
				replacement = {};
			}
			return _replaceAll(message, replacement);
		};

		/**
		 * 文字列内の指定要素を全て置換
		 * @param {string} str 置換対象文字列
		 * @param {Object} replacement 置換データ; {key}をvalueで置換（一度置換した文字列にその後のkeyがヒットしても置換しない）
		 * @return {string} 置換後の文字列
		 * @private
		 */
		function _replaceAll(str, replacement)
		{
			let r = _clone(replacement);
			const k = _getFirstKey(r);
			if(k === null)
			{
				// 置換対象なし
				return str;
			}

			// 置換後の値を取り出して置換対象から取り除く
			const v = r[k];
			delete r[k];

			// "{置換前の文字列}"で分割して、各要素を再帰的に置換
			let s = str.split(`{${k}}`);
			for(let i = 0; i < s.length; i++)
			{
				s[i] = _replaceAll(s[i], r);
			}
			// 分割した要素を置換後の文字列で結合
			return s.join(v);
		}

		/**
		 * オブジェクトをクローン
		 * @param {Object} obj クローン対象のオブジェクト
		 * @return {Object} クローン後のオブジェクト
		 * @private
		 */
		function _clone(obj)
		{
			return Object.assign({}, obj);
		}

		/**
		 * オブジェクト内の最初のキーを取得
		 * @param {Object} obj オブジェクト
		 * @return {string|null} 最初のキー or null
		 * @private
		 */
		function _getFirstKey(obj)
		{
			const keys = Object.keys(obj);
			if(keys.length === 0)
			{
				return null;
			}
			return keys[0];
		}
	}
})();
