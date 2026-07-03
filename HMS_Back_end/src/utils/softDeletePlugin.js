// Reusable soft delete behavior that adds deletion fields and hides deleted documents unless withDeleted is passed
function softDeletePlugin(schema) {
    schema.add({
        isDeleted: {
            type: Boolean,
            default: undefined
        },
        deletedAt: {
            type: Date,
            default: undefined
        },
        deletedBy: {
            type: String,
            default: undefined
        }
    });

    // Exclude soft deleted documents from finds and counts unless explicitly opted out
    const excludeDeleted = function () {
        if (this.getOptions().withDeleted) {
            return;
        }
        const filter = this.getFilter();
        if (filter.isDeleted === undefined) {
            this.where({ isDeleted: { $ne: true } });
        }
    };

    schema.pre(/^find/, excludeDeleted);
    schema.pre("countDocuments", excludeDeleted);
}

module.exports = softDeletePlugin;
