set -e

zero_commit='0000000000000000000000000000000000000000'
msg_regex='[JP\-[0-9]+\]'

while read -r oldrev newrev refname; do

	# Branch or tag got deleted, ignore the push
    [ "$newrev" = "$zero_commit" ] && continue

    # Calculate range for new branch/updated branch
    [ "$oldrev" = "$zero_commit" ] && range="$newrev" || range="$oldrev..$newrev"

	for commit in $(git rev-list "$range" --not --all); do
		if ! git log --max-count=1 --format=%B $commit | grep -iqE "$msg_regex"; then
			echo "ERROR:"
			echo "ERROR: Your push was rejected because the commit"
			echo "ERROR: $commit in ${refname#refs/heads/}"
			echo "ERROR: is missing the JIRA Issue 'JIRA-123'."
			echo "ERROR:"
			echo "ERROR: Please fix the commit message and push again."
			echo "ERROR: https://help.github.com/en/articles/changing-a-commit-message"
			echo "ERROR"
			exit 1
		fi
	done

done
