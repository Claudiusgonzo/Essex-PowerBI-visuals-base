/*
 * MIT License
 *
 * Copyright (c) 2016 Microsoft
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * The key used to store settings metadata on the settings class
 */
import { ISetting, ISettingDescriptor, ISettingsClass } from './interfaces'
import { METADATA_KEY } from './helpers'
const assignIn = require('lodash.assignin') // tslint:disable-line

/**
 * Defines a setting to be used with powerBI
 * @param config The configuration used to control how a setting operates
 */
export function setting<T>(config: ISettingDescriptor<T>) {
	'use strict'
	return function(target: any, key: string) {
		let settingItem = {
			propertyName: key,
			descriptor: config,
			isChildSettings: false,
			classType: target
		} as ISetting
		if (Object.freeze) {
			settingItem = Object.freeze(settingItem)
		}
		defineSetting(target, key, settingItem)
		Object.defineProperty(target, key, {
			writable: true,
			enumerable: true
		})
		return target
	}
}

/**
 * Defines a setting that has a set of nested child settings
 * @param config The child setting class type
 * @param descriptor The additional set of configuration settings to control how a setting operates
 */
export function settings<T>(
	config: Function,
	descriptor?: ISettingDescriptor<T>
) {
	'use strict'
	return function(target: any, key: string) {
		const childCtor = <ISettingsClass<Object>>config

		// Extend the class so we can add custom properties on it
		const augmentedChildClass = class ChildSettingsClass extends childCtor {}

		// Define the metadata object of the augmentedChildClass as the metadata on the actual child ctor
		const childMetadata = defineMetadata(childCtor)

		descriptor = descriptor || {}

		let settingItem = {
			propertyName: key,
			descriptor,
			isChildSettings: true,
			childClassType: augmentedChildClass,
			classType: target
		} as ISetting

		// Extend from the child metadata, so we can add additional properties
		defineMetadata(augmentedChildClass, Object.create(childMetadata))

		// Sets up the child inheritance to point to this setting
		setupChildInheritance(settingItem)

		if (!config) {
			throw new Error(`Could not find config for setting: ${key}`)
		}

		if (Object.freeze) {
			settingItem = Object.freeze(settingItem)
		}

		// Define the setting on the target
		defineSetting(target, key, settingItem)

		Object.defineProperty(target, key, {
			writable: true,
			enumerable: true
		})
		return target
	}
}

/**
 * Creates an inherited setting
 * @param parent The parent setting
 * @param child The child setting
 */
function inheritSetting(parent: ISetting, child: ISetting) {
	'use strict'
	const newSetting = Object.create(assignIn({}, child), {
		// Make the child setting inherit the parent
		descriptor: {
			value: Object.create(
				{
					category: parent.descriptor.category // Only inherit the category for now
				},
				Object.keys(child.descriptor).reduce((a, b) => {
					a[b] = {
						enumerable: true,
						value: child.descriptor[b]
					}
					return a
				}, {})
			)
		}
	})
	newSetting.parentSetting = parent
	newSetting.classType = parent.childClassType

	// Update the children too, if necessary
	setupChildInheritance(newSetting)

	return newSetting
}

/**
 * Sets up the child inheirtance for the given parent setting
 */
function setupChildInheritance(settingItem: ISetting) {
	'use strict'

	if (settingItem.isChildSettings) {
		// Gets the metadata for the child class
		const metadata = defineMetadata(settingItem.childClassType)

		// Update the child settings to point to ourselves
		metadata.settings = Object.keys(metadata.settings).reduce(
			(map, name) => {
				map[name] = inheritSetting(settingItem, metadata.settings[name])
				return map
			},
			{}
		)
	}
}

/**
 * Defines the metadata object for the given class
 * @param target The target to define the metadata on
 * @param metadata The metadata to add
 */
function defineMetadata<T>(target: ISettingsClass<T>, metadata?: any) {
	'use strict'
	const metadataTarget =
		target.constructor === Function ? target : target.constructor
	return (metadataTarget[METADATA_KEY] =
		metadata || metadataTarget[METADATA_KEY] || {})
}

/**
 * Defines the settings metadata for the given class
 * @param target The target to define the metadata on
 */
function defineSettingsMetadata<T>(target: ISettingsClass<T>) {
	'use strict'
	const metadata = defineMetadata(target)
	return (metadata.settings = metadata.settings || {})
}

/**
 * Defines the given setting on the given class
 * @param target The target to define the metadata on
 * @param propName The name of the metadata to add
 * @param value The value of the metadata to add.
 */
export function defineSetting<T>(
	target: ISettingsClass<T>,
	propName: string,
	value: ISetting
) {
	'use strict'
	defineSettingsMetadata(target)[propName] = value
}
