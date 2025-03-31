# SortByPipe Documentation

## SortByPipe

A custom Angular pipe that sorts an array of objects by a specified property path.

### Installation

This pipe is part of the shared module and is available as a standalone component.

### Usage

```html
<!-- In your template -->
<div *ngFor="let item of items | sortBy:'propertyName'">
  {{ item.propertyName }}
</div>
```

### Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| array | any[] | The array to sort | (required) |
| path | string | The property path to sort by (supports dot notation for nested properties) | (required) |
| descending | boolean | Whether to sort in descending order | false |

### Examples

#### Basic sorting:

```html
<!-- Sort users by name (ascending) -->
<div *ngFor="let user of users | sortBy:'name'">
  {{ user.name }}
</div>
```

#### Descending order:

```html
<!-- Sort users by name (descending) -->
<div *ngFor="let user of users | sortBy:'name':true">
  {{ user.name }}
</div>
```

#### Nested properties:

```html
<!-- Sort users by a nested property -->
<div *ngFor="let user of users | sortBy:'profile.age'">
  {{ user.profile.age }}
</div>
```

### Features

- Supports sorting by nested properties using dot notation (e.g., 'user.address.city')
- Handles undefined values (items with undefined values are placed at the end)
- Provides warning in the console when the specified property doesn't exist in any array item
