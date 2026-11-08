import React from 'react';
import { router } from 'expo-router';
import { CategoryTile, ListGroup, ListRow, Sheet } from '@/components/ui';

export type AddChoice = 'cash' | 'manual';

interface Props {
    visible: boolean;
    onClose: () => void;
    /** Opens the manual add form; 'cash' preselects the cash wallet. */
    onChoose: (choice: AddChoice) => void;
}

/**
 * "Add to LogIt" (Figma 1003:674): the + button. Paste a message comes first
 * in the design because it's what alerts are made of; it's added here once the
 * in-app paste screen exists (Transactions phase).
 */
export function AddSheet({ visible, onClose, onChoose }: Props) {
    const pick = (fn: () => void) => () => {
        onClose();
        fn();
    };

    return (
        <Sheet visible={visible} onClose={onClose} title="Add to LogIt">
            <ListGroup bare>
                <ListRow
                    leading={<CategoryTile tone="cash" icon="cash" size={44} />}
                    title="Log cash"
                    meta="Spent cash you took out"
                    trailing="chevron"
                    onPress={pick(() => onChoose('cash'))}
                />
                <ListRow
                    leading={<CategoryTile tone="transport" icon="edit" size={44} />}
                    title="Add manually"
                    meta="Amount, category, wallet"
                    trailing="chevron"
                    onPress={pick(() => onChoose('manual'))}
                />
                <ListRow
                    leading={<CategoryTile tone="success" icon="receive" size={44} />}
                    title="Expected income"
                    meta="Salary from a bank that doesn’t text"
                    trailing="chevron"
                    onPress={pick(() => router.push('/expected-income'))}
                />
            </ListGroup>
        </Sheet>
    );
}
