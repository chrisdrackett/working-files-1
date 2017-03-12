'use babel';

import {CompositeDisposable} from 'atom'
import _ from 'lodash'
import $ from 'jquery'
import pathUtil from 'path'

export default class WorkingFilesPaneView {
	constructor() {
		this.items = []
		this.itemsList = []
		this.activeEntry = null
		this.paneSub = new CompositeDisposable

		this.element = document.createElement('ul')

		this.element.classList.add('list-tree', 'has-collapsable-children')
		let nested = document.createElement('li')
		nested.classList.add('list-nested-item', 'expanded')
		this.container = document.createElement('ul')
		this.container.classList.add('list-tree', 'tree-view', 'tool-panel')
		let header = document.createElement('div')
		header.setAttribute('is', 'working-files-group');

		atom.commands.add('div.list-item[is=working-files-group]', 'working-files-group:close', event => {
			this.pane.close();
		});

		atom.contextMenu.add({
			'.working-files-menu li.list-item[is=tree-view-file]': [{label: 'Close', command: 'core:close'}],
			'.working-files-menu div.list-item[is=working-files-group]': [{label: 'Close All', command: 'working-files-group:close'}]
		});

		atom.config.observe('working-files.collapsable', collapsable => {
			if (collapsable) {
				header.classList.add('list-item')
				header.style.height = '24px'
				header.style.paddingTop = '0px'
				header.style.marginTop = '-2px'
				header.style.marginLeft = '0px'
				header.style.paddingBottom = '10px'
				header.style.marginBottom = '6px'
				header.style.lineHeight = '2.9em'
			} else {
				header.classList.remove('list-item')
				header.style.height = '21px'
				header.style.paddingTop = '5px'
				header.style.marginTop = '3px'
				header.style.marginLeft = '5px'
				header.style.paddingBottom = '0px'
				header.style.marginBottom = '6px'
				header.style.lineHeight = '2.9em'
			}
		})

		let headerSpan = document.createElement('span')
		this.headerTitle = document.createElement('strong')
		this.headerTitle.innerText = 'Working Files'
		header.style.paddingLeft = '5px'

		headerSpan.appendChild(this.headerTitle)
		header.appendChild(headerSpan)
		nested.appendChild(header)
		nested.appendChild(this.container)
		this.element.appendChild(nested)

		$(this.element).on('click', '.list-nested-item > .list-item', function() {
			nested = $(this).closest('.list-nested-item')
			nested.toggleClass('expanded')
			return nested.toggleClass('collapsed')
		})
		let self = this
		$(this.element).on('click', '.list-item[is=tree-view-file]', function() {
			let tempScrollTop = $('.tree-view-scroller').scrollTop();
			self.pane.activateItem(self.entryForElement(this).item)
			$('.tree-view-scroller').scrollTop(tempScrollTop);
		})
		$(this.element).on('contextmenu', '.list-item[is=tree-view-file]', function() {
			let tempScrollTop = $('.tree-view-scroller').scrollTop();
			self.pane.activateItem(self.entryForElement(this).item)
			$('.tree-view-scroller').scrollTop(tempScrollTop);
		})
	}

	setPane(pane, addIconToElement) {
		this.pane = pane
		this.paneSub.add(pane.observeItems(item => {
			let listItem = document.createElement('li');
			listItem.classList.add('file', 'entry', 'list-item', 'working-files-item');
			listItem.setAttribute('is', 'tree-view-file');
			let closer = document.createElement('button');
			closer.classList.add('close-open-file');
			$(closer).on('click', () => {
				let tempScrollTop = $('.tree-view-scroller').scrollTop();
				pane.destroyItem(this.entryForElement(listItem).item);
				$('.tree-view-scroller').scrollTop(tempScrollTop);
			});
			listItem.appendChild(closer);
			let listItemName = document.createElement('span');
				listItemName.classList.add('name', 'icon', 'icon-file-text');
      var itemPath = ''
			try {
				itemPath = item.getPath() || '';

				if (addIconToElement) {
					listItemName.classList.remove('icon-file-text');
					addIconToElement(listItemName, itemPath);
				}
			}
			catch (e) {
				console.log(`Error when a page with no path, like 'settings', is open: ${e}`)
				console.log(`This error is ignored and thus the 'settings' page is now in the working-files list`)
			}
			let itemTitle = item.getTitle()
			let itemDir = pathUtil.dirname(itemPath)
			let itemExt = pathUtil.extname(itemPath)
			let pathName = itemDir + '/' + itemTitle
			listItemName.setAttribute('data-name', itemTitle);
			listItem.appendChild(listItemName)

			listItem.getPath = function() {
				return itemPath;
			}

			this.itemsList.push({
				name: itemTitle,
				dir: itemDir,
				ext: itemExt,
				pathName: pathName
			})

			const compareNames = function (a, b) {
				if (a['name'] !== b['name']) {
					return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
				}
			}
			const compareExt = function (a, b) {
				if (a['ext'] !== b['ext']) {
					return a.ext.toLowerCase().localeCompare(b.ext.toLowerCase())
				}
			}
			const compareDir = function (a, b) {
				if (a['dir'] !== b['dir']) {
					return a.dir.toLowerCase().localeCompare(b.dir.toLowerCase())
				}
			}

			const compareFunctions = [compareNames, compareExt, compareDir]

			let getSortOrder = function (sortOrder) {
				let sortOrderArray = sortOrder.split(/[\s,;:-]+/)
				let newSortOrderArray = sortOrderArray.map(term => term.replace(/[^a-zA-Z]/g, ''))
				return newSortOrderArray
			}

			let sortOrder = getSortOrder(atom.config.get('working-files.sortOrder'))

			let sortOrderNumber = []
			for (let i = 0; i < 3; i++) {
				switch (sortOrder[i]) {
					case 'base':
						sortOrderNumber.push(0)
						break

					case 'ext':
						sortOrderNumber.push(1)
						break

					case 'dir':
						sortOrderNumber.push(2)
						break

					default:
						sortOrderNumber.push(0)
				}
			}
			if (this.itemsList.length > 0) {
				this.itemsList.sort(function (a, b) {
					let ret1 = compareFunctions[sortOrderNumber[0]](a, b)
					if (ret1 != null) return ret1
					let ret2 = compareFunctions[sortOrderNumber[1]](a, b)
					if (ret2 != null) return ret2
					let ret3 = compareFunctions[sortOrderNumber[2]](a, b)
					if (ret3 != null) return ret3
				})

				let index = this.itemsList.findIndex(x => x.pathName === pathName)
				if (index === 0) {
					this.container.insertBefore(listItem, this.container.firstChild);
				} else {
					let itemsTemp = this.container.querySelectorAll('.list-item')
					this.container.insertBefore(listItem, itemsTemp[index-1].nextSibling)
				}
			} else {
				this.container.appendChild(listItem);
			}

			if (item.onDidChangeTitle != null) {
				let titleSub = item.onDidChangeTitle(() => {
					return this.updateTitle(item);
				});
				this.paneSub.add(titleSub);
			}
			if (item.onDidChangeModified != null) {
				this.paneSub.add(item.onDidChangeModified(modified => {
					return this.updateModifiedState(item, modified);
				}));
			}

			this.items.push({item, element: listItem});
			this.updateTitle(item);
			this.element.classList.remove('working-files-hidden');

			listItem.scrollIntoViewIfNeeded(true);
		}));

		this.paneSub.add(pane.observeActiveItem(item => {
			return this.setActiveEntry(item);
		}));

		this.paneSub.add(pane.onDidRemoveItem(({item}) => {
			return this.removeEntry(item);
		}));

		return this.paneSub.add(pane.onDidDestroy(() => this.paneSub.dispose()));
	}

	updateTitle(item, siblings=true, useLongTitle=false) {
		var entry;
		let title = item.getTitle();

		if (siblings) {
			for (let i = 0; i < this.items.length; i++) {
				var entry = this.items[i];
				if (entry.item !== item && entry.item.getTitle() === title) {
					useLongTitle = true;
					this.updateTitle(entry.item, false, true);
				}
			}
		}

		if (useLongTitle && (item.getLongTitle != null)) {
			title = item.getLongTitle();
		}

		if (entry = this.entryForItem(item)) {
			return $(entry.element).find('.name').text(title);
		}
	}

	updateModifiedState(item, modified) {
		let entry = this.entryForItem(item);

		return entry.element.classList.toggle('modified', modified);
	}

	entryForItem(item) {
		return _.find(this.items, entry => entry.item === item);
	}

	entryForElement(item) {
		return _.find(this.items, entry => entry.element === item);
	}

	setActiveEntry(item) {
		if (item) {
			let entry;
			this.activeEntry ? this.activeEntry.classList.remove('selected') : undefined;
			if (entry = this.entryForItem(item)) {
				entry.element.classList.add('selected');
				this.activeEntry = entry.element;
				entry.element.scrollIntoViewIfNeeded(true);
			}
		}
	}

	removeEntry(item) {
		let index = _.findIndex(this.items, entry => entry.item === item);

		if (index >= 0) {
			this.items[index].element.remove();
			this.items.splice(index, 1);
			let itemFullPath
			try {
				itemFullPath = item.getPath() || ''
			}
			catch (e) {
				console.log('no path for settings tab');
			}
			if (itemFullPath == null) {
				let itemFullPath = item.getTitle()
			}
			let indexTitleList = this.itemsList.findIndex(x => x.pathName === itemFullPath)
			if (indexTitleList > -1) {
				this.itemsList.splice(indexTitleList, 1)
			}
		}

		if (this.items.length == 0) {
				this.element.classList.add('working-files-hidden');
		}

		return this.items.map((entry) => this.updateTitle(entry.item));
	}

	// Returns an object that can be retrieved when package is activated
	serialize() {}

	// Tear down any state and detach
	destroy() {
		this.element.remove();
		return this.paneSub.dispose();
	}
}
