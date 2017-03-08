'use babel';

import { requirePackages } from 'atom-utils'
import OpenFilesView from './open-files-view'


let addIconToElement;

export default {
  openFilesView: null,
	config: {
		collapsable: {
			title: 'Collapsable',
			description: 'If selected, the open files panel becomes collapsable, i.e., it can be collapsed with a click on the header',
			type: 'boolean',
			default: true
		},
		sortOrder: {
			title: 'Sort Order',
			description: 'Indicate the order of the criteria for the sorting of the open files list, separated by commas. Options: base (filename), ext (extension), dir (directory)',
			type: 'string',
			default: 'base, ext, dir'
		}
	},

  consumeElementIcons(func) {
    addIconToElement = func;
  },

  activate(state) {
		return requirePackages('tree-view').then(([treeView]) => {
			this.openFilesView = new OpenFilesView(addIconToElement);

			if (treeView.treeView) {
				this.openFilesView.show()
			}
			atom.commands.add('atom-workspace', 'tree-view:toggle', () => {
				if (treeView.treeView.is(':visible')) {
					return this.openFilesView.show()
				} else {
					return this.openFilesView.hide()
				}
			})

			return atom.commands.add('atom-workspace', 'tree-view:show', () => {
				return this.openFilesView.show()
			})
		})
	},

  deactivate() {
    return this.openFilesView.destroy();
  },

  serialize() {}
}
